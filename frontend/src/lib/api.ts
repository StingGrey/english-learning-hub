/**
 * API 层 —— 纯客户端实现
 * 所有操作直接读写 IndexedDB，AI 调用直连 OpenAI API
 * 接口签名保持不变，页面组件无需修改
 */
import { db, todayStr, nowStr, seedDefaults } from "./db";
import * as ai from "./ai";
import * as rss from "./rss";
import { processReview, getTodayReviews } from "./review";

// 确保初始化
let _seeded = false;
async function ensureSeed() {
  if (!_seeded) {
    await seedDefaults();
    _seeded = true;
  }
}

export const api = {
  // ─── Plan ───
  plan: {
    getToday: async () => {
      await ensureSeed();
      const plan = await db.dailyPlan.where("plan_date").equals(todayStr()).first();
      if (!plan) return null;
      const tasks = await db.planTask.where("plan_id").equals(plan.id!).toArray();
      return { ...plan, tasks };
    },

    generate: async (data?: { goal?: string; daily_minutes?: number }) => {
      await ensureSeed();
      const profile = await db.userProfile.toCollection().first();
      const goal = data?.goal || profile?.goal || "general";
      const minutes = data?.daily_minutes || profile?.daily_minutes || 30;

      // 删除今日已有计划
      const existing = await db.dailyPlan.where("plan_date").equals(todayStr()).first();
      if (existing) {
        await db.planTask.where("plan_id").equals(existing.id!).delete();
        await db.dailyPlan.delete(existing.id!);
      }

      // AI 生成任务
      const tasksData = await ai.generatePlanTasks(goal, minutes);

      const planId = await db.dailyPlan.add({
        plan_date: todayStr(),
        goal,
        total_minutes: minutes,
        created_at: nowStr(),
      });

      for (const t of tasksData) {
        await db.planTask.add({
          plan_id: planId as number,
          title: t.title,
          task_type: t.task_type || "reading",
          duration_minutes: t.duration_minutes || 10,
          is_completed: false,
        });
      }

      const tasks = await db.planTask.where("plan_id").equals(planId as number).toArray();
      const plan = await db.dailyPlan.get(planId as number);
      return { ...plan, tasks };
    },

    completeTask: async (taskId: number) => {
      await db.planTask.update(taskId, {
        is_completed: true,
        completed_at: nowStr(),
      });
      return { ok: true };
    },
  },

  // ─── Content ───
  content: {
    fetch: async () => {
      const count = await rss.fetchAllSources();
      return { new_articles: count };
    },

    recommend: async (count = 5) => {
      await ensureSeed();
      const articles = await rss.recommendArticles(count);
      const sources = await db.newsSource.toArray();
      const sourceMap = Object.fromEntries(sources.map((s) => [s.id, s.name]));
      return articles.map((a) => ({
        ...a,
        source_name: a.source_id ? sourceMap[a.source_id] || null : null,
      }));
    },

    articles: async (params?: { difficulty?: string; category?: string; limit?: number; offset?: number }) => {
      await ensureSeed();
      let articles = await db.article.toArray();

      // 按 fetched_at 降序排序（最新的在前）
      articles.sort((a, b) => (b.fetched_at > a.fetched_at ? 1 : -1));

      if (params?.difficulty) {
        articles = articles.filter((a) => a.difficulty === params.difficulty);
      }

      if (params?.category) {
        articles = articles.filter((a) => a.category === params.category);
      }

      const offset = params?.offset || 0;
      const limit = params?.limit || 20;
      articles = articles.slice(offset, offset + limit);

      const sources = await db.newsSource.toArray();
      const sourceMap = Object.fromEntries(sources.map((s) => [s.id, s.name]));

      return articles.map((a) => ({
        ...a,
        source_name: a.source_id ? sourceMap[a.source_id] || null : null,
      }));
    },

    // 获取所有文章的分类列表
    categories: async () => {
      await ensureSeed();
      const articles = await db.article.toArray();
      const cats = new Set<string>();
      for (const a of articles) {
        if (a.category) cats.add(a.category);
      }
      return Array.from(cats).sort();
    },

    getArticle: async (id: number) => {
      const article = await db.article.get(id);
      if (!article) return null;

      await db.article.update(id, { is_read: true });

      const sentences = await db.articleSentence
        .where("article_id")
        .equals(id)
        .sortBy("index");

      return {
        ...article,
        is_read: true,
        sentences: sentences.map((s) => ({
          index: s.index,
          text_en: s.text_en,
          text_zh: s.text_zh || "",
        })),
      };
    },

    // 保存文章句子翻译到 IndexedDB（供双语模式持久化）
    saveTranslations: async (articleId: number, translations: string[]) => {
      const sentences = await db.articleSentence
        .where("article_id")
        .equals(articleId)
        .sortBy("index");

      for (const sentence of sentences) {
        const translation = translations[sentence.index];
        if (translation) {
          await db.articleSentence.update(sentence.id!, { text_zh: translation });
        }
      }
      return { ok: true };
    },
  },

  // ─── Translate ───
  translate: {
    selection: async (text: string, context?: string) => {
      return ai.translateText(text, context || "");
    },

    explain: async (text: string, context?: string) => {
      const explanation = await ai.explainText(text, context || "");
      return { explanation };
    },

    sentences: async (sentences: string[]) => {
      const translations = await ai.translateSentences(sentences);
      return { translations };
    },
  },

  // ─── Vocab ───
  vocab: {
    mark: async (data: {
      word: string;
      lemma?: string;
      pos?: string;
      definition?: string;
      definition_en?: string;
      pronunciation?: string;
      example_sentence?: string;
      article_id?: number;
    }) => {
      // 检查是否已存在
      const existing = await db.vocabItem.where("word").equals(data.word).first();
      if (existing) return existing;

      // 如果缺少释义，通过 AI 补全
      let wordInfo: any = {};
      if (!data.definition) {
        try {
          wordInfo = await ai.getWordDefinition(data.word, data.example_sentence || "");
        } catch {
          /* 静默失败 */
        }
      }

      const id = await db.vocabItem.add({
        word: data.word,
        lemma: data.lemma || wordInfo.lemma || data.word,
        pos: data.pos || wordInfo.pos || "",
        definition: data.definition || wordInfo.definition || "",
        definition_en: data.definition_en || wordInfo.definition_en || "",
        example_sentence: data.example_sentence,
        article_id: data.article_id,
        pronunciation: data.pronunciation || wordInfo.pronunciation || "",
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 0,
        next_review_date: todayStr(),
        is_mastered: false,
        created_at: nowStr(),
      });

      return db.vocabItem.get(id as number);
    },

    list: async (params?: { mastered?: boolean; limit?: number }) => {
      let items = await db.vocabItem.orderBy("created_at").reverse().toArray();
      if (params?.mastered !== undefined) {
        items = items.filter((v) => v.is_mastered === params.mastered);
      }
      return items.slice(0, params?.limit || 100);
    },

    reviewToday: async () => {
      return getTodayReviews();
    },

    submitReview: async (vocabId: number, quality: number) => {
      return processReview(vocabId, quality);
    },

    delete: async (vocabId: number) => {
      await db.vocabReview.where("vocab_id").equals(vocabId).delete();
      await db.vocabItem.delete(vocabId);
      return { ok: true };
    },
  },

  // ─── Speaking ───
  speaking: {
    turn: async (data: { session_id?: number; content: string; scenario?: string }) => {
      let sessionId = data.session_id;

      if (!sessionId) {
        sessionId = (await db.speakingSession.add({
          topic: "Free conversation",
          scenario: data.scenario || "daily",
          started_at: nowStr(),
        })) as number;
      }

      // 保存用户发言
      await db.speakingTurn.add({
        session_id: sessionId,
        role: "user",
        content: data.content,
        created_at: nowStr(),
      });

      // 获取对话历史
      const turns = await db.speakingTurn
        .where("session_id")
        .equals(sessionId)
        .sortBy("created_at");
      const conversation = turns.map((t) => ({ role: t.role, content: t.content }));

      // 获取场景
      const session = await db.speakingSession.get(sessionId);

      // AI 回复
      const result = await ai.speakingReply(conversation, session?.scenario || "daily");

      // 保存 AI 回复
      await db.speakingTurn.add({
        session_id: sessionId,
        role: "assistant",
        content: result.reply,
        correction: result.correction || undefined,
        suggestion: result.suggestion || undefined,
        created_at: nowStr(),
      });

      return {
        session_id: sessionId,
        role: "assistant",
        content: result.reply,
        correction: result.correction,
        suggestion: result.suggestion,
      };
    },

    sessions: async () => {
      const sessions = await db.speakingSession.orderBy("started_at").reverse().limit(20).toArray();
      const result = [];
      for (const s of sessions) {
        const turnCount = await db.speakingTurn.where("session_id").equals(s.id!).count();
        result.push({
          id: s.id,
          topic: s.topic,
          scenario: s.scenario,
          started_at: s.started_at,
          turn_count: turnCount,
        });
      }
      return result;
    },

    getTurns: async (sessionId: number) => {
      return db.speakingTurn.where("session_id").equals(sessionId).sortBy("created_at");
    },
  },

  // ─── Writing ───
  writing: {
    evaluate: async (data: { title?: string; content: string }) => {
      const wordCount = data.content.trim().split(/\s+/).length;

      const subId = (await db.writingSubmission.add({
        title: data.title || "Untitled",
        content: data.content,
        word_count: wordCount,
        submitted_at: nowStr(),
      })) as number;

      const result = await ai.evaluateWriting(data.title || "", data.content);

      await db.writingFeedback.add({
        submission_id: subId,
        score: result.score ?? undefined,
        grammar_issues: result.grammar_issues,
        expression_suggestions: result.expression_suggestions,
        structure_feedback: result.structure_feedback,
        overall_comment: result.overall_comment,
        improved_version: result.improved_version,
        created_at: nowStr(),
      });

      return { submission_id: subId, ...result };
    },

    history: async () => {
      const submissions = await db.writingSubmission.orderBy("submitted_at").reverse().limit(20).toArray();
      const result = [];
      for (const s of submissions) {
        const fb = await db.writingFeedback.where("submission_id").equals(s.id!).first();
        result.push({
          id: s.id,
          title: s.title,
          word_count: s.word_count,
          submitted_at: s.submitted_at,
          score: fb?.score ?? null,
        });
      }
      return result;
    },
  },

  // ─── Stats ───
  stats: {
    today: async () => {
      await ensureSeed();
      const today = todayStr();

      const plan = await db.dailyPlan.where("plan_date").equals(today).first();
      let tasksDone = 0;
      let tasksTotal = 0;
      if (plan) {
        const tasks = await db.planTask.where("plan_id").equals(plan.id!).toArray();
        tasksTotal = tasks.length;
        tasksDone = tasks.filter((t) => t.is_completed).length;
      }

      const todayStart = today + "T00:00:00";
      const newVocab = await db.vocabItem.filter((v) => v.created_at >= todayStart).count();
      const dueReview = await db.vocabItem.filter((v) => !v.is_mastered && v.next_review_date <= today).count();

      return { tasks_done: tasksDone, tasks_total: tasksTotal, new_vocab: newVocab, due_review: dueReview };
    },

    weekly: async () => {
      await ensureSeed();
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 6);
      const weekAgoStr = weekAgo.toISOString().slice(0, 10);

      // 任务统计
      const plans = await db.dailyPlan.filter((p) => p.plan_date >= weekAgoStr).toArray();
      let totalTasks = 0;
      let completedTasks = 0;
      for (const p of plans) {
        const tasks = await db.planTask.where("plan_id").equals(p.id!).toArray();
        totalTasks += tasks.length;
        completedTasks += tasks.filter((t) => t.is_completed).length;
      }

      // 新增生词
      const weekAgoISO = weekAgoStr + "T00:00:00";
      const newVocab = await db.vocabItem.filter((v) => v.created_at >= weekAgoISO).count();

      // 复习统计
      const reviewCount = await db.vocabReview.filter((r) => r.reviewed_at >= weekAgoISO).count();

      // 今日复习完成率
      const todayStr2 = todayStr();
      const todayDue = await db.vocabItem.filter((v) => !v.is_mastered && v.next_review_date <= todayStr2).count();
      const todayStart = todayStr2 + "T00:00:00";
      const todayReviewed = await db.vocabReview.filter((r) => r.reviewed_at >= todayStart).count();
      const reviewRate = todayReviewed / Math.max(todayDue + todayReviewed, 1);

      // 每日分解
      const daily = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekAgo);
        d.setDate(d.getDate() + i);
        const dStr = d.toISOString().slice(0, 10);
        const dStart = dStr + "T00:00:00";
        const dEnd = dStr + "T23:59:59";

        const dayPlans = await db.dailyPlan.where("plan_date").equals(dStr).toArray();
        let dayTasks = 0;
        for (const p of dayPlans) {
          dayTasks += (await db.planTask.where("plan_id").equals(p.id!).filter((t) => t.is_completed).count());
        }
        const dayVocab = await db.vocabItem.filter((v) => v.created_at >= dStart && v.created_at <= dEnd).count();

        daily.push({ date: dStr, completed_tasks: dayTasks, new_vocab: dayVocab });
      }

      return {
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        total_study_minutes: 0,
        new_vocab_count: newVocab,
        review_count: reviewCount,
        review_completion_rate: Math.round(reviewRate * 100) / 100,
        daily_breakdown: daily,
      };
    },
  },

  // ─── Settings ───
  settings: {
    get: async () => {
      await ensureSeed();
      const profile = await db.userProfile.toCollection().first();
      return profile || {
        goal: "general",
        daily_minutes: 30,
        ai_api_key: "",
        ai_base_url: "https://api.openai.com/v1",
        ai_model: "gpt-4o-mini",
        ai_api_format: "openai",
        ai_vertex_config: "",
        ai_model_translation: "",
        ai_model_word: "",
      };
    },

    update: async (data: {
      goal?: string;
      daily_minutes?: number;
      ai_api_key?: string;
      ai_base_url?: string;
      ai_model?: string;
      ai_api_format?: "openai" | "claude" | "gemini";
      ai_vertex_config?: string;
      ai_model_translation?: string;
      ai_model_word?: string;
    }) => {
      await ensureSeed();
      const profile = await db.userProfile.toCollection().first();
      if (!profile) return;
      const updates: any = {};
      if (data.goal !== undefined) updates.goal = data.goal;
      if (data.daily_minutes !== undefined) updates.daily_minutes = data.daily_minutes;
      if (data.ai_api_key !== undefined) updates.ai_api_key = data.ai_api_key;
      if (data.ai_base_url !== undefined) updates.ai_base_url = data.ai_base_url;
      if (data.ai_model !== undefined) updates.ai_model = data.ai_model;
      if (data.ai_api_format !== undefined) updates.ai_api_format = data.ai_api_format;
      if (data.ai_vertex_config !== undefined) updates.ai_vertex_config = data.ai_vertex_config;
      if (data.ai_model_translation !== undefined) updates.ai_model_translation = data.ai_model_translation;
      if (data.ai_model_word !== undefined) updates.ai_model_word = data.ai_model_word;
      await db.userProfile.update(profile.id!, updates);
      return db.userProfile.get(profile.id!);
    },
  },

  // ─── Vocab Book ───
  vocabBook: {
    list: async () => {
      return db.vocabBook.orderBy("created_at").reverse().toArray();
    },

    get: async (bookId: number) => {
      const book = await db.vocabBook.get(bookId);
      if (!book) return null;
      const words = await db.vocabBookWord.where("book_id").equals(bookId).toArray();
      return { ...book, words };
    },

    create: async (data: { name: string; text: string }) => {
      // AI 提取单词
      const extractedWords = await ai.extractWordsFromText(data.text);

      const bookId = (await db.vocabBook.add({
        name: data.name,
        description: `从文本中提取了 ${extractedWords.length} 个单词`,
        word_count: extractedWords.length,
        created_at: nowStr(),
      })) as number;

      for (const w of extractedWords) {
        await db.vocabBookWord.add({
          book_id: bookId,
          word: w.word,
          definition: w.definition || "",
          definition_en: w.definition_en || "",
          pos: w.pos || "",
          pronunciation: w.pronunciation || "",
          example: w.example || "",
          is_added_to_vocab: false,
        });
      }

      return api.vocabBook.get(bookId);
    },

    delete: async (bookId: number) => {
      await db.vocabBookWord.where("book_id").equals(bookId).delete();
      await db.vocabBook.delete(bookId);
      return { ok: true };
    },

    addWordToVocab: async (wordId: number) => {
      const bookWord = await db.vocabBookWord.get(wordId);
      if (!bookWord) return null;

      // 调用现有的 vocab.mark
      const vocabItem = await api.vocab.mark({
        word: bookWord.word,
        definition: bookWord.definition,
        pos: bookWord.pos,
      });

      // 标记为已添加
      await db.vocabBookWord.update(wordId, { is_added_to_vocab: true });

      return vocabItem;
    },

    addAllToVocab: async (bookId: number) => {
      const words = await db.vocabBookWord.where("book_id").equals(bookId).toArray();
      let added = 0;
      for (const w of words) {
        if (w.is_added_to_vocab) continue;
        const existing = await db.vocabItem.where("word").equals(w.word).first();
        if (!existing) {
          await db.vocabItem.add({
            word: w.word,
            lemma: w.word,
            pos: w.pos || "",
            definition: w.definition || "",
            definition_en: w.definition_en || "",
            example_sentence: w.example || "",
            pronunciation: w.pronunciation || "",
            ease_factor: 2.5,
            interval_days: 1,
            repetitions: 0,
            next_review_date: todayStr(),
            is_mastered: false,
            created_at: nowStr(),
          });
        }
        await db.vocabBookWord.update(w.id!, { is_added_to_vocab: true });
        added++;
      }
      return { added };
    },

    generateArticle: async (data: {
      bookId?: number;
      includeVocab?: boolean;
      difficulty?: string;
      topic?: string;
    }) => {
      const words: string[] = [];

      // 从词汇书获取单词
      if (data.bookId) {
        const bookWords = await db.vocabBookWord.where("book_id").equals(data.bookId).toArray();
        words.push(...bookWords.map((w) => w.word));
      }

      // 从生词本获取单词
      if (data.includeVocab) {
        const vocabWords = await db.vocabItem
          .filter((v) => !v.is_mastered)
          .limit(30)
          .toArray();
        words.push(...vocabWords.map((v) => v.word));
      }

      // 去重
      const uniqueWords = Array.from(new Set(words.map((w) => w.toLowerCase())));
      if (uniqueWords.length === 0) {
        throw new Error("没有可用的单词来生成文章");
      }

      // 限制单词数量（太多 AI 难以自然融入）
      const selectedWords = uniqueWords.slice(0, 40);

      const article = await ai.generateArticleFromWords(selectedWords, {
        difficulty: data.difficulty,
        topic: data.topic,
      });

      // 保存为文章
      const articleId = (await db.article.add({
        title: article.title,
        url: "",
        content: article.content,
        summary: `AI 根据 ${selectedWords.length} 个单词生成的文章`,
        difficulty: data.difficulty || "medium",
        category: "ai-generated",
        word_count: article.word_count,
        is_recommended: false,
        is_read: false,
        fetched_at: nowStr(),
      })) as number;

      // 保存句子
      for (let i = 0; i < article.sentences.length; i++) {
        await db.articleSentence.add({
          article_id: articleId,
          index: i,
          text_en: article.sentences[i].text_en,
          text_zh: article.sentences[i].text_zh || "",
        });
      }

      return { article_id: articleId, ...article };
    },
  },
};
