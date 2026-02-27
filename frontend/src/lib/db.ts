/**
 * IndexedDB 数据库层 —— 用 Dexie.js 替代后端 SQLite
 * 所有数据存储在浏览器本地，无需服务器
 */
import Dexie, { type Table } from "dexie";

// ─── 类型定义 ───

export interface UserProfile {
  id?: number;
  goal: string;
  daily_minutes: number;
  ai_api_key: string;
  ai_base_url: string;
  ai_model: string;
  ai_api_format?: "openai" | "claude" | "gemini";
  ai_vertex_config?: string; // JSON 序列化的 Vertex 配置
  ai_model_translation?: string; // 翻译专用模型（可选，留空则使用主模型）
  ai_model_word?: string; // 单词讲解专用模型（可选，留空则使用主模型）
  webdav_config?: string; // JSON 序列化的 WebDAVConfig
}

export interface DailyPlan {
  id?: number;
  plan_date: string; // YYYY-MM-DD
  goal: string;
  total_minutes: number;
  created_at: string;
}

export interface PlanTask {
  id?: number;
  plan_id: number;
  title: string;
  task_type: string;
  duration_minutes: number;
  is_completed: boolean;
  completed_at?: string;
}

export interface NewsSource {
  id?: number;
  name: string;
  url: string;
  category: string;
  is_active: boolean;
  last_fetched?: string;
}

export interface Article {
  id?: number;
  source_id?: number;
  title: string;
  url: string;
  content: string;
  summary?: string;
  difficulty: string;
  category?: string;
  word_count: number;
  readability_score?: number;
  is_recommended: boolean;
  is_read: boolean;
  published_at?: string;
  fetched_at: string;
}

export interface ArticleSentence {
  id?: number;
  article_id: number;
  index: number;
  text_en: string;
  text_zh?: string;
}

export interface VocabItem {
  id?: number;
  word: string;
  lemma?: string;
  pos?: string;
  definition?: string;
  definition_en?: string;
  example_sentence?: string;
  article_id?: number;
  pronunciation?: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_date: string; // YYYY-MM-DD
  is_mastered: boolean;
  created_at: string;
}

export interface VocabReview {
  id?: number;
  vocab_id: number;
  quality: number;
  reviewed_at: string;
}

export interface SpeakingSession {
  id?: number;
  topic: string;
  scenario: string;
  started_at: string;
  ended_at?: string;
}

export interface SpeakingTurn {
  id?: number;
  session_id: number;
  role: string;
  content: string;
  correction?: string;
  suggestion?: string;
  created_at: string;
}

export interface WritingSubmission {
  id?: number;
  title: string;
  content: string;
  word_count: number;
  submitted_at: string;
}

export interface WritingFeedback {
  id?: number;
  submission_id: number;
  score?: number;
  grammar_issues?: string;
  expression_suggestions?: string;
  structure_feedback?: string;
  overall_comment?: string;
  improved_version?: string;
  created_at: string;
}

export interface StudySession {
  id?: number;
  session_type: string;
  started_at: string;
  ended_at?: string;
  duration_seconds: number;
}

export interface VocabBook {
  id?: number;
  name: string;
  description?: string;
  word_count: number;
  created_at: string;
}

export interface VocabBookWord {
  id?: number;
  book_id: number;
  word: string;
  definition?: string;
  definition_en?: string;
  pos?: string;
  pronunciation?: string;
  example?: string;
  is_added_to_vocab: boolean;
}

// ─── 数据库定义 ───

class EnglishLearningDB extends Dexie {
  userProfile!: Table<UserProfile>;
  dailyPlan!: Table<DailyPlan>;
  planTask!: Table<PlanTask>;
  newsSource!: Table<NewsSource>;
  article!: Table<Article>;
  articleSentence!: Table<ArticleSentence>;
  vocabItem!: Table<VocabItem>;
  vocabReview!: Table<VocabReview>;
  speakingSession!: Table<SpeakingSession>;
  speakingTurn!: Table<SpeakingTurn>;
  writingSubmission!: Table<WritingSubmission>;
  writingFeedback!: Table<WritingFeedback>;
  studySession!: Table<StudySession>;
  vocabBook!: Table<VocabBook>;
  vocabBookWord!: Table<VocabBookWord>;

  constructor() {
    super("EnglishLearningHub");

    this.version(1).stores({
      userProfile: "++id",
      dailyPlan: "++id, plan_date",
      planTask: "++id, plan_id",
      newsSource: "++id, url",
      article: "++id, source_id, url, difficulty, is_read, is_recommended",
      articleSentence: "++id, article_id",
      vocabItem: "++id, word, next_review_date, is_mastered",
      vocabReview: "++id, vocab_id, reviewed_at",
      speakingSession: "++id",
      speakingTurn: "++id, session_id",
      writingSubmission: "++id",
      writingFeedback: "++id, submission_id",
      studySession: "++id, session_type, started_at",
    });

    this.version(2).stores({
      userProfile: "++id",
      dailyPlan: "++id, plan_date",
      planTask: "++id, plan_id",
      newsSource: "++id, url",
      article: "++id, source_id, url, difficulty, is_read, is_recommended",
      articleSentence: "++id, article_id",
      vocabItem: "++id, word, next_review_date, is_mastered",
      vocabReview: "++id, vocab_id, reviewed_at",
      speakingSession: "++id",
      speakingTurn: "++id, session_id",
      writingSubmission: "++id",
      writingFeedback: "++id, submission_id",
      studySession: "++id, session_type, started_at",
      vocabBook: "++id",
      vocabBookWord: "++id, book_id, word",
    });

    this.version(3).stores({
      userProfile: "++id",
      dailyPlan: "++id, plan_date",
      planTask: "++id, plan_id",
      newsSource: "++id, url",
      article: "++id, source_id, url, difficulty, is_read, is_recommended",
      articleSentence: "++id, article_id",
      vocabItem: "++id, word, next_review_date, is_mastered",
      vocabReview: "++id, vocab_id, reviewed_at",
      speakingSession: "++id",
      speakingTurn: "++id, session_id",
      writingSubmission: "++id",
      writingFeedback: "++id, submission_id",
      studySession: "++id, session_type, started_at",
      vocabBook: "++id",
      vocabBookWord: "++id, book_id, word",
    });

    // v4: 增加 fetched_at 索引（修复文章列表排序）；为新闻源添加迁移
    this.version(4).stores({
      userProfile: "++id",
      dailyPlan: "++id, plan_date",
      planTask: "++id, plan_id",
      newsSource: "++id, url",
      article: "++id, source_id, url, difficulty, is_read, is_recommended, fetched_at",
      articleSentence: "++id, article_id",
      vocabItem: "++id, word, next_review_date, is_mastered",
      vocabReview: "++id, vocab_id, reviewed_at",
      speakingSession: "++id",
      speakingTurn: "++id, session_id",
      writingSubmission: "++id",
      writingFeedback: "++id, submission_id",
      studySession: "++id, session_type, started_at",
      vocabBook: "++id",
      vocabBookWord: "++id, book_id, word",
    }).upgrade(async (tx) => {
      // 为已有用户添加新闻源
      const existingUrls = await tx.table("newsSource").toCollection().primaryKeys();
      if (existingUrls.length > 0) {
        const allSources = await tx.table("newsSource").toArray();
        const existingSourceUrls = new Set(allSources.map((s: NewsSource) => s.url));
        const newSources = [
          { name: "AP News", url: "https://feeds.apnews.com/rss/apf-topnews", category: "world", is_active: true },
          { name: "CNN", url: "http://rss.cnn.com/rss/cnn_topstories.rss", category: "world", is_active: true },
          { name: "ABC News", url: "https://feeds.abcnews.com/abcnews/topstories", category: "world", is_active: true },
          { name: "Al Jazeera English", url: "https://www.aljazeera.com/xml/rss/all.xml", category: "world", is_active: true },
          { name: "Scientific American", url: "https://www.scientificamerican.com/feed/", category: "science", is_active: true },
          { name: "Time Magazine", url: "https://feeds.feedburner.com/time/topstories", category: "general", is_active: true },
        ];
        for (const src of newSources) {
          if (!existingSourceUrls.has(src.url)) {
            await tx.table("newsSource").add(src);
          }
        }
      }
    });
  }
}

export const db = new EnglishLearningDB();

// ─── 初始化种子数据 ───

export async function seedDefaults() {
  const profileCount = await db.userProfile.count();
  if (profileCount === 0) {
    await db.userProfile.add({
      goal: "general",
      daily_minutes: 30,
      ai_api_key: "",
      ai_base_url: "https://api.openai.com/v1",
      ai_model: "gpt-4o-mini",
      ai_api_format: "openai",
      ai_vertex_config: "",
      ai_model_translation: "",
      ai_model_word: "",
    });
  }

  const sourceCount = await db.newsSource.count();
  if (sourceCount === 0) {
    await db.newsSource.bulkAdd([
      { name: "BBC News", url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "world", is_active: true },
      { name: "Reuters", url: "https://feeds.reuters.com/reuters/topNews", category: "world", is_active: true },
      { name: "NPR", url: "https://feeds.npr.org/1001/rss.xml", category: "general", is_active: true },
      { name: "The Guardian", url: "https://www.theguardian.com/world/rss", category: "world", is_active: true },
      { name: "VOA News", url: "https://www.voanews.com/api/zq$omekvi_", category: "world", is_active: true },
      { name: "AP News", url: "https://feeds.apnews.com/rss/apf-topnews", category: "world", is_active: true },
      { name: "CNN", url: "http://rss.cnn.com/rss/cnn_topstories.rss", category: "world", is_active: true },
      { name: "ABC News", url: "https://feeds.abcnews.com/abcnews/topstories", category: "world", is_active: true },
      { name: "Al Jazeera English", url: "https://www.aljazeera.com/xml/rss/all.xml", category: "world", is_active: true },
      { name: "Scientific American", url: "https://www.scientificamerican.com/feed/", category: "science", is_active: true },
      { name: "Time Magazine", url: "https://feeds.feedburner.com/time/topstories", category: "general", is_active: true },
    ]);
  }
}

// ─── 工具函数 ───

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nowStr(): string {
  return new Date().toISOString();
}
