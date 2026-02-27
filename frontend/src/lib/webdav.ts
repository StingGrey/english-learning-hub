/**
 * WebDAV 同步服务 —— 实现多设备数据同步与备份
 * 使用标准 WebDAV 协议，兼容坚果云、NextCloud、Synology 等
 */
import { db } from "./db";

export interface WebDAVConfig {
  url: string; // WebDAV 服务器地址
  username: string;
  password: string;
  syncPath: string; // 同步文件路径，如 /english-hub/
}

// 获取 WebDAV 配置（存在 userProfile 中）
async function getConfig(): Promise<WebDAVConfig | null> {
  const profile = await db.userProfile.toCollection().first();
  if (!profile) return null;
  const raw = (profile as any).webdav_config;
  if (!raw) return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

// 构造基本认证 Header
function authHeader(config: WebDAVConfig): string {
  return "Basic " + btoa(config.username + ":" + config.password);
}

// 规范化 URL
function buildUrl(config: WebDAVConfig, filename: string): string {
  const base = config.url.replace(/\/+$/, "");
  const path = config.syncPath.replace(/^\/+|\/+$/g, "");
  return `${base}/${path}/${filename}`;
}

// ─── WebDAV 操作 ───

async function webdavPut(
  config: WebDAVConfig,
  filename: string,
  data: string
): Promise<void> {
  const url = buildUrl(config, filename);

  // 先确保目录存在 (MKCOL)
  const dirUrl = url.substring(0, url.lastIndexOf("/") + 1);
  try {
    await fetch(dirUrl, {
      method: "MKCOL",
      headers: { Authorization: authHeader(config) },
    });
  } catch {
    // 目录可能已存在，忽略错误
  }

  const resp = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: authHeader(config),
      "Content-Type": "application/json",
    },
    body: data,
  });

  if (!resp.ok && resp.status !== 201 && resp.status !== 204) {
    throw new Error(`WebDAV PUT 失败: ${resp.status} ${resp.statusText}`);
  }
}

async function webdavGet(
  config: WebDAVConfig,
  filename: string
): Promise<string | null> {
  const url = buildUrl(config, filename);

  const resp = await fetch(url, {
    method: "GET",
    headers: { Authorization: authHeader(config) },
  });

  if (resp.status === 404) return null;
  if (!resp.ok) {
    throw new Error(`WebDAV GET 失败: ${resp.status} ${resp.statusText}`);
  }

  return resp.text();
}

async function webdavTest(config: WebDAVConfig): Promise<boolean> {
  const url = config.url.replace(/\/+$/, "") + "/";
  try {
    const resp = await fetch(url, {
      method: "PROPFIND",
      headers: {
        Authorization: authHeader(config),
        Depth: "0",
      },
    });
    return resp.ok || resp.status === 207;
  } catch {
    return false;
  }
}

// ─── 数据序列化 ───

interface SyncData {
  version: 2;
  exported_at: string;
  tables: {
    userProfile: any[];
    dailyPlan: any[];
    planTask: any[];
    newsSource: any[];
    article: any[];
    articleSentence: any[];
    vocabItem: any[];
    vocabReview: any[];
    speakingSession: any[];
    speakingTurn: any[];
    writingSubmission: any[];
    writingFeedback: any[];
    studySession: any[];
    vocabBook: any[];
    vocabBookWord: any[];
  };
}

async function exportAllData(): Promise<SyncData> {
  return {
    version: 2,
    exported_at: new Date().toISOString(),
    tables: {
      userProfile: await db.userProfile.toArray(),
      dailyPlan: await db.dailyPlan.toArray(),
      planTask: await db.planTask.toArray(),
      newsSource: await db.newsSource.toArray(),
      article: await db.article.toArray(),
      articleSentence: await db.articleSentence.toArray(),
      vocabItem: await db.vocabItem.toArray(),
      vocabReview: await db.vocabReview.toArray(),
      speakingSession: await db.speakingSession.toArray(),
      speakingTurn: await db.speakingTurn.toArray(),
      writingSubmission: await db.writingSubmission.toArray(),
      writingFeedback: await db.writingFeedback.toArray(),
      studySession: await db.studySession.toArray(),
      vocabBook: await db.vocabBook.toArray(),
      vocabBookWord: await db.vocabBookWord.toArray(),
    },
  };
}

async function importAllData(data: SyncData): Promise<void> {
  // 清空所有表再导入
  await db.transaction(
    "rw",
    [
      db.userProfile,
      db.dailyPlan,
      db.planTask,
      db.newsSource,
      db.article,
      db.articleSentence,
      db.vocabItem,
      db.vocabReview,
      db.speakingSession,
      db.speakingTurn,
      db.writingSubmission,
      db.writingFeedback,
      db.studySession,
      db.vocabBook,
      db.vocabBookWord,
    ],
    async () => {
      await db.userProfile.clear();
      await db.dailyPlan.clear();
      await db.planTask.clear();
      await db.newsSource.clear();
      await db.article.clear();
      await db.articleSentence.clear();
      await db.vocabItem.clear();
      await db.vocabReview.clear();
      await db.speakingSession.clear();
      await db.speakingTurn.clear();
      await db.writingSubmission.clear();
      await db.writingFeedback.clear();
      await db.studySession.clear();
      await db.vocabBook.clear();
      await db.vocabBookWord.clear();

      const t = data.tables;
      if (t.userProfile?.length) await db.userProfile.bulkAdd(t.userProfile);
      if (t.dailyPlan?.length) await db.dailyPlan.bulkAdd(t.dailyPlan);
      if (t.planTask?.length) await db.planTask.bulkAdd(t.planTask);
      if (t.newsSource?.length) await db.newsSource.bulkAdd(t.newsSource);
      if (t.article?.length) await db.article.bulkAdd(t.article);
      if (t.articleSentence?.length) await db.articleSentence.bulkAdd(t.articleSentence);
      if (t.vocabItem?.length) await db.vocabItem.bulkAdd(t.vocabItem);
      if (t.vocabReview?.length) await db.vocabReview.bulkAdd(t.vocabReview);
      if (t.speakingSession?.length) await db.speakingSession.bulkAdd(t.speakingSession);
      if (t.speakingTurn?.length) await db.speakingTurn.bulkAdd(t.speakingTurn);
      if (t.writingSubmission?.length) await db.writingSubmission.bulkAdd(t.writingSubmission);
      if (t.writingFeedback?.length) await db.writingFeedback.bulkAdd(t.writingFeedback);
      if (t.studySession?.length) await db.studySession.bulkAdd(t.studySession);
      if (t.vocabBook?.length) await db.vocabBook.bulkAdd(t.vocabBook);
      if (t.vocabBookWord?.length) await db.vocabBookWord.bulkAdd(t.vocabBookWord);
    }
  );
}

// ─── 公开 API ───

export const webdav = {
  /** 测试 WebDAV 连接 */
  testConnection: async (config: WebDAVConfig): Promise<boolean> => {
    return webdavTest(config);
  },

  /** 保存 WebDAV 配置 */
  saveConfig: async (config: WebDAVConfig): Promise<void> => {
    const profile = await db.userProfile.toCollection().first();
    if (!profile) return;
    await db.userProfile.update(profile.id!, {
      webdav_config: JSON.stringify(config),
    } as any);
  },

  /** 获取 WebDAV 配置 */
  getConfig,

  /** 上传（备份）数据到 WebDAV */
  backup: async (): Promise<{ exported_at: string }> => {
    const config = await getConfig();
    if (!config) throw new Error("请先配置 WebDAV");

    const data = await exportAllData();
    const json = JSON.stringify(data);

    // 上传当前备份
    await webdavPut(config, "english-hub-data.json", json);

    // 同时保存一份带时间戳的备份
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    await webdavPut(config, `backups/english-hub-${ts}.json`, json);

    return { exported_at: data.exported_at };
  },

  /** 从 WebDAV 恢复（下载）数据 */
  restore: async (): Promise<{ imported_at: string; record_count: number }> => {
    const config = await getConfig();
    if (!config) throw new Error("请先配置 WebDAV");

    const json = await webdavGet(config, "english-hub-data.json");
    if (!json) throw new Error("WebDAV 上没有找到备份数据");

    const data: SyncData = JSON.parse(json);
    if (!data.version || !data.tables) {
      throw new Error("备份数据格式不正确");
    }

    await importAllData(data);

    // 统计记录数
    let count = 0;
    for (const arr of Object.values(data.tables)) {
      if (Array.isArray(arr)) count += arr.length;
    }

    return { imported_at: data.exported_at, record_count: count };
  },

  /** 导出数据为 JSON 文件（本地下载） */
  exportToFile: async (): Promise<void> => {
    const data = await exportAllData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `english-hub-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  /** 从 JSON 文件导入数据 */
  importFromFile: async (file: File): Promise<{ record_count: number }> => {
    const text = await file.text();
    const data: SyncData = JSON.parse(text);
    if (!data.version || !data.tables) {
      throw new Error("文件格式不正确");
    }

    await importAllData(data);

    let count = 0;
    for (const arr of Object.values(data.tables)) {
      if (Array.isArray(arr)) count += arr.length;
    }

    return { record_count: count };
  },
};
