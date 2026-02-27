/**
 * 客户端 AI 服务 —— 兼容 OpenAI / Claude / Gemini(API Key & Vertex)
 * API Key / Vertex 配置存储在 IndexedDB 的 userProfile 中
 */
import { db } from "./db";

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
};

type ToolDefinition = {
  name: string;
  description?: string;
  parameters: Record<string, any>;
};

type ToolCall = {
  id: string;
  name: string;
  arguments: string;
};

type ChatResult = {
  text: string;
  toolCalls: ToolCall[];
};

type AIFormat = "openai" | "claude" | "gemini";

type VertexServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
  project_id?: string;
};

type VertexConfig = {
  enabled?: boolean;
  project_id: string;
  location: string;
  service_account_json: string;
};

type AIConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  apiFormat: AIFormat;
  vertexConfig: VertexConfig | null;
};

const DEFAULT_BASE_URLS: Record<AIFormat, string> = {
  openai: "https://api.openai.com/v1",
  claude: "https://api.anthropic.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta",
};

let vertexTokenCache: { token: string; expiresAt: number; cacheKey: string } | null = null;

function parseMaybeJSON<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

function parseVertexConfig(raw?: string): VertexConfig | null {
  if (!raw?.trim()) return null;
  const parsed = parseMaybeJSON<any>(raw, null);
  if (!parsed || typeof parsed !== "object") return null;

  // 兼容两种输入：
  // 1) 包装对象：{ project_id, location, service_account_json }
  // 2) 直接粘贴 service account JSON（含 client_email/private_key）
  const isServiceAccountObject = Boolean(parsed.client_email && parsed.private_key);
  const wrapperServiceAccount = parsed.service_account_json;
  const serviceAccountJSON = isServiceAccountObject
    ? JSON.stringify(parsed)
    : typeof wrapperServiceAccount === "string"
      ? wrapperServiceAccount.trim()
      : wrapperServiceAccount && typeof wrapperServiceAccount === "object"
        ? JSON.stringify(wrapperServiceAccount)
        : "";

  const projectId = String(parsed.project_id || parsed.projectId || "").trim();
  const location = String(parsed.location || parsed.region || "").trim() || "us-central1";

  if (!projectId || !serviceAccountJSON) return null;
  return {
    enabled: parsed.enabled !== false,
    project_id: projectId,
    location,
    service_account_json: serviceAccountJSON,
  };
}

export function hasUsableVertexConfig(raw?: string): boolean {
  const config = parseVertexConfig(raw);
  return Boolean(config?.enabled);
}

async function getConfig(): Promise<AIConfig> {
  const profile = await db.userProfile.toCollection().first();
  if (!profile) {
    throw new Error("请先在设置页面完成 AI 配置");
  }

  const apiFormat = (profile.ai_api_format || "openai") as AIFormat;
  const baseUrl = profile.ai_base_url || DEFAULT_BASE_URLS[apiFormat] || DEFAULT_BASE_URLS.openai;
  const vertexConfig = parseVertexConfig(profile.ai_vertex_config);
  const hasApiKey = Boolean(profile.ai_api_key?.trim());
  const canUseVertexAuth = apiFormat === "gemini" && Boolean(vertexConfig?.enabled);

  if (!hasApiKey && !canUseVertexAuth) {
    throw new Error("请先在设置页面配置 AI API Key，或为 Gemini 提供有效 Vertex JSON 鉴权");
  }

  return {
    apiKey: profile.ai_api_key || "",
    baseUrl,
    model: profile.ai_model || "gpt-4o-mini",
    apiFormat,
    vertexConfig,
  };
}

function parseJSON(text: string): any {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  return JSON.parse(cleaned);
}

function toBase64Url(input: string | ArrayBuffer): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let str = "";
  bytes.forEach((b) => {
    str += String.fromCharCode(b);
  });
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getVertexAccessToken(vertexConfig: VertexConfig): Promise<string> {
  const serviceAccount = parseMaybeJSON<VertexServiceAccount>(vertexConfig.service_account_json, {
    client_email: "",
    private_key: "",
  });

  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("Vertex 鉴权失败：service_account_json 缺少 client_email 或 private_key");
  }

  const now = Math.floor(Date.now() / 1000);
  const cacheKey = `${serviceAccount.client_email}:${vertexConfig.project_id}:${vertexConfig.location}`;
  if (vertexTokenCache && vertexTokenCache.cacheKey === cacheKey && vertexTokenCache.expiresAt - 60 > now) {
    return vertexTokenCache.token;
  }

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: serviceAccount.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const assertion = `${signingInput}.${toBase64Url(signature)}`;

  const tokenResp = await fetch(serviceAccount.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!tokenResp.ok) {
    throw new Error(`Vertex 获取 token 失败: ${tokenResp.status} ${await tokenResp.text()}`);
  }

  const tokenData = await tokenResp.json();
  const accessToken = tokenData.access_token as string;
  const expiresIn = Number(tokenData.expires_in || 3600);

  vertexTokenCache = {
    token: accessToken,
    expiresAt: now + expiresIn,
    cacheKey,
  };

  return accessToken;
}

function splitSystemMessage(messages: ChatMessage[]) {
  const systemMessages = messages.filter((m) => m.role === "system").map((m) => m.content);
  const system = systemMessages.join("\n\n").trim();
  const nonSystem = messages.filter((m) => m.role !== "system");
  return { system, nonSystem };
}

function normalizeTextFromParts(parts: any[] = []): string {
  return parts
    .map((p) => (typeof p?.text === "string" ? p.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

async function chatWithTools(
  messages: ChatMessage[],
  temperature = 0.7,
  tools?: ToolDefinition[]
): Promise<ChatResult> {
  const config = await getConfig();

  if (config.apiFormat === "openai") {
    const resp = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature,
        ...(tools?.length
          ? {
              tools: tools.map((t) => ({ type: "function", function: t })),
              tool_choice: "auto",
            }
          : {}),
      }),
    });

    if (!resp.ok) {
      throw new Error(`AI API Error ${resp.status}: ${await resp.text()}`);
    }

    const data = await resp.json();
    const message = data.choices?.[0]?.message || {};
    const toolCalls: ToolCall[] = (message.tool_calls || []).map((call: any) => ({
      id: call.id,
      name: call.function?.name || "",
      arguments: call.function?.arguments || "{}",
    }));

    return {
      text: message.content || "",
      toolCalls,
    };
  }

  if (config.apiFormat === "claude") {
    const { system, nonSystem } = splitSystemMessage(messages);
    const claudeMessages = nonSystem
      .filter((m) => m.role !== "tool")
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      }));

    const resp = await fetch(`${config.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 2048,
        temperature,
        ...(system ? { system } : {}),
        messages: claudeMessages,
        ...(tools?.length
          ? {
              tools: tools.map((t) => ({
                name: t.name,
                description: t.description || "",
                input_schema: t.parameters,
              })),
              tool_choice: { type: "auto" },
            }
          : {}),
      }),
    });

    if (!resp.ok) {
      throw new Error(`Claude API Error ${resp.status}: ${await resp.text()}`);
    }

    const data = await resp.json();
    const blocks = (data.content || []) as any[];
    const text = blocks
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    const toolCalls: ToolCall[] = blocks
      .filter((b) => b.type === "tool_use")
      .map((b) => ({
        id: b.id,
        name: b.name,
        arguments: JSON.stringify(b.input || {}),
      }));

    return { text, toolCalls };
  }

  // Gemini
  const { system, nonSystem } = splitSystemMessage(messages);
  const contents = nonSystem.map((m) => {
    if (m.role === "assistant") {
      return { role: "model", parts: [{ text: m.content }] };
    }
    if (m.role === "tool") {
      return {
        role: "user",
        parts: [{ functionResponse: { name: m.name || "tool", response: parseMaybeJSON(m.content, { content: m.content }) } }],
      };
    }
    return { role: "user", parts: [{ text: m.content }] };
  });

  const geminiBody: any = {
    contents,
    generationConfig: {
      temperature,
    },
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    ...(tools?.length
      ? {
          tools: [
            {
              functionDeclarations: tools.map((t) => ({
                name: t.name,
                description: t.description || "",
                parameters: t.parameters,
              })),
            },
          ],
        }
      : {}),
  };

  let url = "";
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (config.vertexConfig?.enabled) {
    const accessToken = await getVertexAccessToken(config.vertexConfig);
    const { project_id, location } = config.vertexConfig;
    url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project_id}/locations/${location}/publishers/google/models/${config.model}:generateContent`;
    headers.Authorization = `Bearer ${accessToken}`;
  } else {
    const base = config.baseUrl.replace(/\/$/, "");
    url = `${base}/models/${config.model}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
  }

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(geminiBody),
  });

  if (!resp.ok) {
    throw new Error(`Gemini API Error ${resp.status}: ${await resp.text()}`);
  }

  const data = await resp.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const text = normalizeTextFromParts(parts);
  const toolCalls: ToolCall[] = parts
    .filter((p: any) => p.functionCall)
    .map((p: any, idx: number) => ({
      id: p.functionCall.id || `gemini-tool-${idx}`,
      name: p.functionCall.name || "",
      arguments: JSON.stringify(p.functionCall.args || {}),
    }));

  return { text, toolCalls };
}

async function chat(messages: ChatMessage[], temperature = 0.7): Promise<string> {
  const result = await chatWithTools(messages, temperature);
  return result.text;
}

// ─── 模型列表 ───

export async function fetchModels(
  apiKey: string,
  baseUrl: string,
  apiFormat: AIFormat,
  vertexConfigRaw?: string
): Promise<{ id: string; owned_by?: string }[]> {
  if (apiFormat === "openai") {
    const resp = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!resp.ok) throw new Error(`获取模型列表失败: ${resp.status}`);
    const data = await resp.json();
    const models = (data.data || []) as { id: string; owned_by?: string }[];
    models.sort((a, b) => a.id.localeCompare(b.id));
    return models;
  }

  if (apiFormat === "claude") {
    const resp = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });
    if (!resp.ok) throw new Error(`获取 Claude 模型失败: ${resp.status}`);
    const data = await resp.json();
    const models = (data.data || []).map((m: any) => ({ id: m.id, owned_by: "anthropic" }));
    models.sort((a: any, b: any) => a.id.localeCompare(b.id));
    return models;
  }

  const vertexConfig = parseVertexConfig(vertexConfigRaw);
  if (vertexConfig?.enabled) {
    const token = await getVertexAccessToken(vertexConfig);
    const { project_id, location } = vertexConfig;
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project_id}/locations/${location}/publishers/google/models`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`获取 Vertex Gemini 模型失败: ${resp.status}`);
    const data = await resp.json();
    const models = (data.publisherModels || []).map((m: any) => ({
      id: (m.name || "").split("/").pop() || m.versionId || "",
      owned_by: "google-vertex",
    }));
    return models.filter((m: any) => m.id).sort((a: any, b: any) => a.id.localeCompare(b.id));
  }

  const base = baseUrl.replace(/\/$/, "");
  const resp = await fetch(`${base}/models?key=${encodeURIComponent(apiKey)}`);
  if (!resp.ok) throw new Error(`获取 Gemini 模型失败: ${resp.status}`);
  const data = await resp.json();
  const models = (data.models || []).map((m: any) => ({ id: (m.name || "").replace(/^models\//, ""), owned_by: "google" }));
  return models.sort((a: any, b: any) => a.id.localeCompare(b.id));
}

export { chatWithTools };

// ─── 公开 API ───

export async function translateText(text: string, context = ""): Promise<{ translation: string; explanation: string }> {
  const prompt = `请翻译以下英文为中文。如果有上下文，请结合上下文理解含义。
返回 JSON 格式: {"translation": "中文翻译", "explanation": "简要语法/用法解释（如有必要）"}

上下文: ${context}
待翻译文本: ${text}`;

  const result = await chat([{ role: "user", content: prompt }], 0.3);
  try {
    return parseJSON(result);
  } catch {
    return { translation: result, explanation: "" };
  }
}

export async function explainText(text: string, context = ""): Promise<string> {
  const prompt = `请用中文详细讲解以下英文文本的语法结构、关键词汇用法和搭配。
要求简洁明了，适合英语学习者阅读。

上下文: ${context}
待讲解文本: ${text}`;

  return chat([{ role: "user", content: prompt }], 0.5);
}

export async function translateSentences(sentences: string[]): Promise<string[]> {
  if (!sentences.length) return [];

  const prompt = `请逐句翻译以下英文句子为中文，保持序号对应。
只返回翻译结果，每行一个，不要序号。

${sentences.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;

  const result = await chat([{ role: "user", content: prompt }], 0.3);
  const translations = result
    .trim()
    .split("\n")
    .filter((l) => l.trim());

  while (translations.length < sentences.length) translations.push("");
  return translations.slice(0, sentences.length);
}

export async function getWordDefinition(
  word: string,
  sentence = ""
): Promise<{
  word: string;
  lemma: string;
  pos: string;
  definition: string;
  definition_en: string;
  pronunciation: string;
}> {
  const prompt = `分析以下英语单词，返回 JSON 格式:
{
  "word": "原始单词",
  "lemma": "词形还原（原形）",
  "pos": "词性（noun/verb/adj/adv/prep/conj/pron/det）",
  "definition": "中文释义",
  "definition_en": "英文释义",
  "pronunciation": "音标"
}

单词: ${word}
来源句子: ${sentence}`;

  const result = await chat([{ role: "user", content: prompt }], 0.3);
  try {
    return parseJSON(result);
  } catch {
    return { word, lemma: word, pos: "", definition: "", definition_en: "", pronunciation: "" };
  }
}

export async function generateSummary(text: string): Promise<string> {
  const prompt = `请用1-2句中文概括以下英文文章的核心内容：\n\n${text.slice(0, 3000)}`;
  return chat([{ role: "user", content: prompt }], 0.5);
}

export async function generatePlanTasks(
  goal: string,
  dailyMinutes: number
): Promise<{ title: string; task_type: string; duration_minutes: number }[]> {
  const prompt = `作为英语学习规划师，为以下学习者生成今日学习任务列表。
返回 JSON 数组格式: [{"title": "任务名称", "task_type": "类型", "duration_minutes": 分钟数}]

task_type 可选: reading, vocab_review, speaking, writing, listening, grammar

学习目标: ${goal}
可用时间: ${dailyMinutes} 分钟

要求：
- 任务总时长不超过 ${dailyMinutes} 分钟
- 任务数量 3-6 个
- 包含至少1个阅读任务和1个复习任务
- 任务名称用中文`;

  const result = await chat([{ role: "user", content: prompt }], 0.7);
  try {
    return parseJSON(result);
  } catch {
    return [
      { title: "阅读一篇外刊文章", task_type: "reading", duration_minutes: 15 },
      { title: "复习今日生词", task_type: "vocab_review", duration_minutes: 10 },
      { title: "口语对话练习", task_type: "speaking", duration_minutes: 5 },
    ];
  }
}

export async function speakingReply(
  conversation: { role: string; content: string }[],
  scenario = "daily"
): Promise<{ reply: string; correction: string | null; suggestion: string | null }> {
  const system = `你是一个友好的英语口语陪练伙伴。场景：${scenario}。
规则：
1. 用英文回复用户，保持对话自然流畅
2. 如果用户的英文有语法或表达错误，在回复后指出
3. 返回 JSON 格式:
{
  "reply": "你的英文回复",
  "correction": "对用户上一句话的纠错（如有错误）或 null",
  "suggestion": "更地道的替代表达建议（如有）或 null"
}`;

  const messages: ChatMessage[] = [{ role: "system", content: system }, ...(conversation as ChatMessage[])];
  const result = await chat(messages, 0.8);
  try {
    return parseJSON(result);
  } catch {
    return { reply: result, correction: null, suggestion: null };
  }
}

export async function evaluateWriting(
  title: string,
  content: string
): Promise<{
  score: number | null;
  grammar_issues: string;
  expression_suggestions: string;
  structure_feedback: string;
  overall_comment: string;
  improved_version: string;
}> {
  const prompt = `作为专业英语写作教师，请批改以下作文并返回 JSON 格式:
{
  "score": 0-100分,
  "grammar_issues": "语法问题列表（用中文解释每个问题）",
  "expression_suggestions": "表达优化建议",
  "structure_feedback": "结构与逻辑建议",
  "overall_comment": "总体评价（中文）",
  "improved_version": "修改后的完整版本"
}

标题: ${title || "无标题"}
作文内容:
${content}`;

  const result = await chat([{ role: "user", content: prompt }], 0.5);
  try {
    return parseJSON(result);
  } catch {
    return {
      score: null,
      grammar_issues: result,
      expression_suggestions: "",
      structure_feedback: "",
      overall_comment: "",
      improved_version: "",
    };
  }
}

// ─── 词汇书 ───

export async function extractWordsFromText(
  text: string
): Promise<
  {
    word: string;
    definition: string;
    definition_en: string;
    pos: string;
    pronunciation: string;
    example: string;
  }[]
> {
  // 分段处理长文本
  const maxChunkSize = 4000;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += maxChunkSize) {
    chunks.push(text.slice(i, i + maxChunkSize));
  }

  const allWords: any[] = [];

  for (const chunk of chunks) {
    const prompt = `你是一个英语词汇提取专家。从以下文本中提取所有英语单词/词组，并整理成结构化列表。

要求：
1. 提取所有有学习价值的英语单词和短语（忽略 a/the/is/are 等极常见功能词）
2. 如果文本是词汇表格式（如每行一个单词或单词+释义），请按原格式提取
3. 如果文本是文章/段落，请提取关键词汇
4. 词形还原为原形（如 running → run, better → good）
5. 每个单词提供中英释义、词性、音标和一个例句

返回 JSON 数组:
[{
  "word": "原形单词",
  "definition": "中文释义",
  "definition_en": "英文释义",
  "pos": "词性(noun/verb/adj/adv/prep/conj/phrase)",
  "pronunciation": "音标",
  "example": "例句"
}]

文本内容:
${chunk}`;

    const result = await chat([{ role: "user", content: prompt }], 0.3);
    try {
      const words = parseJSON(result);
      if (Array.isArray(words)) {
        allWords.push(...words);
      }
    } catch {
      // 静默跳过解析失败的块
    }
  }

  // 去重
  const seen = new Set<string>();
  return allWords.filter((w) => {
    const key = (w.word || "").toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function generateArticleFromWords(
  words: string[],
  options?: { difficulty?: string; topic?: string }
): Promise<{
  title: string;
  content: string;
  sentences: { text_en: string; text_zh: string }[];
  word_count: number;
}> {
  const difficulty = options?.difficulty || "medium";
  const topic = options?.topic || "";

  const difficultyGuide = {
    easy: "使用简单句式，文章长度 150-250 词，适合初中水平",
    medium: "使用中等复杂句式，文章长度 250-400 词，适合高中/大学水平",
    hard: "使用复杂句式和高级表达，文章长度 400-600 词，适合四六级/雅思水平",
  }[difficulty] || "使用中等复杂句式，文章长度 250-400 词";

  const prompt = `你是一个专业的英语教育内容创作者。请根据以下单词列表生成一篇**真实性的非虚构类英语文章**。

核心要求：
1. **必须是非虚构类文章**（如新闻报道、科普文章、社会评论、技术介绍等）
2. **确保文章内容的真实性和准确性**——事实、数据、观点必须基于现实
3. **自然地融入以下单词**（不要生硬堆砌，至少使用其中 70% 的单词）
4. ${difficultyGuide}
5. 文章结构清晰：有标题、分段
${topic ? `6. 文章主题/方向：${topic}` : "6. 自由选择合适的主题来融入这些词汇"}

需要融入的单词列表：
${words.join(", ")}

返回 JSON 格式:
{
  "title": "英文标题",
  "sentences": [
    {"text_en": "英文句子1", "text_zh": "对应中文翻译1"},
    {"text_en": "英文句子2", "text_zh": "对应中文翻译2"}
  ]
}

注意：
- sentences 按段落和句子顺序排列
- 每个段落开头可以空一个句子来表示段落分隔
- 中文翻译要准确自然`;

  const result = await chat([{ role: "user", content: prompt }], 0.7);
  try {
    const parsed = parseJSON(result);
    const content = (parsed.sentences || []).map((s: any) => s.text_en).join(" ");
    return {
      title: parsed.title || "AI Generated Article",
      content,
      sentences: parsed.sentences || [],
      word_count: content.split(/\s+/).length,
    };
  } catch {
    return {
      title: "AI Generated Article",
      content: result,
      sentences: [{ text_en: result, text_zh: "" }],
      word_count: result.split(/\s+/).length,
    };
  }
}
