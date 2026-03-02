/**
 * 客户端 RSS 抓取服务
 * 通过 CORS 代理获取 RSS 源并解析
 */
import { db, nowStr, type Article } from "./db";

// 多个 CORS 代理备选（如果一个挂了自动切换）
const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

async function fetchWithProxy(url: string): Promise<string> {
  for (const proxy of CORS_PROXIES) {
    try {
      const resp = await fetch(proxy(url), { signal: AbortSignal.timeout(15000) });
      if (resp.ok) return resp.text();
    } catch {
      continue;
    }
  }
  throw new Error(`Failed to fetch: ${url}`);
}

async function fetchReadableArticle(url: string): Promise<string> {
  const mirrorUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}`;
  const resp = await fetch(mirrorUrl, { signal: AbortSignal.timeout(15000) });
  if (!resp.ok) {
    throw new Error(`Failed to fetch readable article: ${url}`);
  }

  const text = await resp.text();
  // r.jina.ai 返回 markdown，移除前置元信息并做基础清理
  const body = text
    .replace(/^Title:\s.*$/m, "")
    .replace(/^URL Source:\s.*$/m, "")
    .replace(/^Markdown Content:\s*/m, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return body;
}

/** 解析 RSS XML 为文章列表 */
function parseRSS(xml: string): { title: string; link: string; description: string; pubDate?: string }[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const items = doc.querySelectorAll("item");
  const results: { title: string; link: string; description: string; pubDate?: string }[] = [];

  items.forEach((item) => {
    const title = item.querySelector("title")?.textContent?.trim() || "";
    const link = item.querySelector("link")?.textContent?.trim() || "";
    const description =
      item.querySelector("description")?.textContent?.trim() ||
      item.querySelector("content\\:encoded")?.textContent?.trim() ||
      "";
    const pubDate = item.querySelector("pubDate")?.textContent?.trim();
    if (title && link) {
      results.push({ title, link, description, pubDate });
    }
  });

  return results;
}

/** 清除 HTML 标签 */
function stripHTML(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

/** 拆分句子 */
export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=["'A-Z])/)
    .filter((s) => s.trim().length > 10);
}

function matchesTopic(item: { title: string; description: string }, topic?: string): boolean {
  if (!topic?.trim()) return true;
  const keyword = topic.trim().toLowerCase();
  const text = `${item.title} ${item.description}`.toLowerCase();
  return text.includes(keyword);
}

async function upsertArticleFromItem(
  source: { id?: number; category: string },
  item: { title: string; link: string; description: string; pubDate?: string }
): Promise<boolean> {
  const existing = await db.article.where("url").equals(item.link).first();
  if (existing) return false;

  let content = stripHTML(item.description);
  // RSS 描述通常只有一两句，优先抓取正文
  if (content.length < 400) {
    try {
      const fullText = await fetchReadableArticle(item.link);
      if (fullText.length > content.length) {
        content = fullText;
      }
    } catch {
      // 回退到 RSS 描述
    }
  }

  if (content.length < 80) return false;

  const wordCount = content.split(/\s+/).length;
  const readability = fleschReadingEase(content);
  const difficulty = scoreToDifficulty(readability);
  const sentences = splitSentences(content);

  const articleId = await db.article.add({
    source_id: source.id,
    title: item.title,
    url: item.link,
    content,
    difficulty,
    category: source.category,
    word_count: wordCount,
    readability_score: readability,
    is_recommended: false,
    is_read: false,
    published_at: item.pubDate ? new Date(item.pubDate).toISOString() : undefined,
    fetched_at: nowStr(),
  });

  for (let i = 0; i < sentences.length; i++) {
    await db.articleSentence.add({
      article_id: articleId as number,
      index: i,
      text_en: sentences[i].trim(),
    });
  }

  return true;
}

/** 简易 Flesch Reading Ease */
export function fleschReadingEase(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim());
  const words = text.split(/\s+/).filter(Boolean);
  if (!sentences.length || !words.length) return 50;

  let syllables = 0;
  for (const w of words) {
    const word = w.toLowerCase().replace(/[^a-z]/g, "");
    let count = 0;
    let prevVowel = false;
    for (const ch of word) {
      const isVowel = "aeiouy".includes(ch);
      if (isVowel && !prevVowel) count++;
      prevVowel = isVowel;
    }
    if (word.endsWith("e") && count > 1) count--;
    syllables += Math.max(count, 1);
  }

  const score = 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables / words.length);
  return Math.max(0, Math.min(100, score));
}

export function scoreToDifficulty(score: number): "easy" | "medium" | "hard" {
  if (score >= 70) return "easy";
  if (score >= 40) return "medium";
  return "hard";
}

/** 从文章页面 HTML 中提取正文（作为 r.jina.ai 失败时的兜底） */
function extractArticleFromHTML(html: string): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const removeSelectors = [
    "script", "style", "nav", "footer", "header", "aside",
    "noscript", "iframe", "form", "svg",
    "[role='navigation']", "[role='banner']", "[role='contentinfo']",
    ".ad", ".ads", ".advertisement", ".social-share", ".comments",
    ".sidebar", ".related", ".recommended", ".newsletter",
  ];
  for (const sel of removeSelectors) {
    doc.querySelectorAll(sel).forEach((el) => el.remove());
  }

  const selectors = [
    "[itemprop='articleBody']",
    "article .article-body",
    "article .story-body",
    ".article-body", ".article-content",
    ".story-body__inner", ".story-body",
    ".post-content", ".entry-content", ".content-body",
    "article", "[role='main']", "main",
  ];

  for (const sel of selectors) {
    const el = doc.querySelector(sel);
    if (!el) continue;
    const paragraphs = el.querySelectorAll("p");
    if (paragraphs.length > 0) {
      const pTexts: string[] = [];
      paragraphs.forEach((p) => {
        const text = p.textContent?.trim();
        if (text && text.length > 20) pTexts.push(text);
      });
      const combined = pTexts.join("\n\n");
      if (combined.length > 200) return combined;
    }
    const text = el.textContent?.trim() || "";
    if (text.length > 200) return text;
  }

  // 兜底：找包含最多 <p> 文本的容器
  const paragraphs = doc.querySelectorAll("p");
  const containers = new Map<Element, number>();
  paragraphs.forEach((p) => {
    const parent = p.parentElement;
    if (parent) {
      containers.set(parent, (containers.get(parent) || 0) + (p.textContent?.trim().length || 0));
    }
  });
  let bestContainer: Element | null = null;
  let bestLength = 0;
  containers.forEach((length, el) => {
    if (length > bestLength) { bestLength = length; bestContainer = el; }
  });
  if (bestContainer && bestLength > 200) {
    const pTexts: string[] = [];
    (bestContainer as Element).querySelectorAll("p").forEach((p) => {
      const text = p.textContent?.trim();
      if (text && text.length > 20) pTexts.push(text);
    });
    return pTexts.join("\n\n");
  }
  return null;
}

/** 从原文 URL 抓取完整内容（先试 r.jina.ai，再试 DOM 解析） */
export async function fetchFullContent(url: string): Promise<string | null> {
  if (!url) return null;
  // 先试 jina reader
  try {
    const text = await fetchReadableArticle(url);
    if (text.length > 200) return text;
  } catch { /* fall through */ }
  // 兜底：CORS 代理 + DOM 解析
  try {
    const html = await fetchWithProxy(url);
    return extractArticleFromHTML(html);
  } catch {
    return null;
  }
}

// ─── 公开 API ───

/** 抓取所有活跃 RSS 源 */
export async function fetchAllSources(topic?: string, limitPerSource = 15): Promise<number> {
  const sources = await db.newsSource.filter((s) => s.is_active).toArray();
  let totalNew = 0;
  const normalizedLimit = Math.min(50, Math.max(1, Math.floor(limitPerSource || 15)));

  for (const source of sources) {
    try {
      const xml = await fetchWithProxy(source.url);
      const items = parseRSS(xml);

      for (const item of items.slice(0, normalizedLimit)) {
        if (!matchesTopic(item, topic)) continue;
        const added = await upsertArticleFromItem(source, item);
        if (added) totalNew++;
      }

      await db.newsSource.update(source.id!, { last_fetched: nowStr() });
    } catch (e) {
      console.warn(`[RSS] Failed to fetch ${source.name}:`, e);
    }
  }

  if (topic?.trim()) {
    try {
      const q = encodeURIComponent(`${topic} when:7d`);
      const googleRss = `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
      const xml = await fetchWithProxy(googleRss);
      const items = parseRSS(xml);

      for (const item of items.slice(0, normalizedLimit)) {
        if (!matchesTopic(item, topic)) continue;
        const added = await upsertArticleFromItem({ category: "topic" }, item);
        if (added) totalNew++;
      }
    } catch (e) {
      console.warn(`[RSS] Failed to fetch topic feed ${topic}:`, e);
    }
  }

  return totalNew;
}

/** 获取推荐文章 */
export async function recommendArticles(count = 5): Promise<Article[]> {
  const unread = await db.article
    .where("is_read")
    .equals(0) // Dexie 用 0 表示 false
    .reverse()
    .sortBy("fetched_at");

  // 也查 false（兼容）
  const unread2 = await db.article
    .filter((a) => !a.is_read)
    .reverse()
    .sortBy("fetched_at");

  const articles = unread.length ? unread : unread2;

  if (!articles.length) return [];

  // 混合难度
  const byDiff: Record<string, Article[]> = { easy: [], medium: [], hard: [] };
  for (const a of articles) {
    (byDiff[a.difficulty] || byDiff.medium).push(a);
  }

  const result: Article[] = [];
  for (const diff of ["medium", "easy", "hard"]) {
    for (const a of byDiff[diff]) {
      if (result.length >= count) break;
      result.push(a);
    }
    if (result.length >= count) break;
  }

  return result;
}
