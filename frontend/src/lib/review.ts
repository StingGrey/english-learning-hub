/**
 * SM-2 间隔重复算法（TypeScript 实现）
 */
import { db, todayStr, nowStr, type VocabItem } from "./db";

/**
 * 处理一次复习，更新 SM-2 参数
 *
 * quality: 0-5 的回忆质量评分
 *   0 - 完全忘记
 *   1 - 几乎忘记
 *   2 - 勉强记得
 *   3 - 有些困难地记起
 *   4 - 较轻松地记起
 *   5 - 完全记得
 */
export async function processReview(vocabId: number, quality: number): Promise<VocabItem> {
  const vocab = await db.vocabItem.get(vocabId);
  if (!vocab) throw new Error(`VocabItem ${vocabId} not found`);

  // 记录复习
  await db.vocabReview.add({
    vocab_id: vocabId,
    quality,
    reviewed_at: nowStr(),
  });

  let { ease_factor, interval_days, repetitions } = vocab;

  if (quality >= 3) {
    // 回忆成功
    if (repetitions === 0) {
      interval_days = 1;
    } else if (repetitions === 1) {
      interval_days = 6;
    } else {
      interval_days = Math.round(interval_days * ease_factor);
    }
    repetitions += 1;
  } else {
    // 回忆失败，重置
    repetitions = 0;
    interval_days = 1;
  }

  // 更新 ease factor（最低 1.3）
  ease_factor = Math.max(1.3, ease_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // 计算下次复习日期
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval_days);
  const next_review_date = nextDate.toISOString().slice(0, 10);

  // 连续5次都评分4+视为掌握
  const is_mastered = repetitions >= 5 && quality >= 4;

  await db.vocabItem.update(vocabId, {
    ease_factor,
    interval_days,
    repetitions,
    next_review_date,
    is_mastered,
  });

  return (await db.vocabItem.get(vocabId))!;
}

/** 获取今日待复习的单词 */
export async function getTodayReviews(): Promise<VocabItem[]> {
  const today = todayStr();
  return db.vocabItem
    .filter((v) => !v.is_mastered && v.next_review_date <= today)
    .sortBy("next_review_date");
}
