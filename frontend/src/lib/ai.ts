/**
 * 客户端 AI 服务 —— 浏览器直连 OpenAI 兼容 API
 * API Key 存储在 IndexedDB 的 userProfile 中
 */
import { db } from "./db";

async function getConfig() {
  const profile = await db.userProfile.toCollection().first();
  if (!profile || !profile.ai_api_key) {
    throw new Error("请先在设置页面配置 AI API Key");
  }
  return {
    apiKey: profile.ai_api_key,
    baseUrl: profile.ai_base_url || "https://api.openai.com/v1",
    model: profile.ai_model || "gpt-4o-mini",
  };
}

async function chat(messages: { role: string; content: string }[], temperature = 0.7): Promise<string> {
  const config = await getConfig();
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
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`AI API Error ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "";
}

function parseJSON(text: string): any {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  return JSON.parse(cleaned);
}

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

  const messages = [{ role: "system", content: system }, ...conversation];
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
