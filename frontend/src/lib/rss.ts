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
function splitSentences(text: string): string[] {
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
function fleschReadingEase(text: string): number {
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

function scoreToDifficulty(score: number): "easy" | "medium" | "hard" {
  if (score >= 70) return "easy";
  if (score >= 40) return "medium";
  return "hard";
}

// ─── 公开 API ───

/** 抓取所有活跃 RSS 源 */
export async function fetchAllSources(topic?: string): Promise<number> {
  const sources = await db.newsSource.filter((s) => s.is_active).toArray();
  let totalNew = 0;

  for (const source of sources) {
    try {
      const xml = await fetchWithProxy(source.url);
      const items = parseRSS(xml);

      for (const item of items.slice(0, 15)) {
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

      for (const item of items.slice(0, 20)) {
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
