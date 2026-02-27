"""SM-2 间隔重复算法（简化版）"""
from datetime import date, timedelta
from sqlalchemy.orm import Session
from models.tables import VocabItem, VocabReview


def process_review(db: Session, vocab_id: int, quality: int) -> VocabItem:
    """处理一次复习，更新 SM-2 参数

    quality: 0-5 的回忆质量评分
      0 - 完全忘记
      1 - 几乎忘记
      2 - 勉强记得
      3 - 有些困难地记起
      4 - 较轻松地记起
      5 - 完全记得
    """
    vocab = db.query(VocabItem).get(vocab_id)
    if not vocab:
        raise ValueError(f"VocabItem {vocab_id} not found")

    # 记录复习
    db.add(VocabReview(vocab_id=vocab_id, quality=quality))

    # SM-2 算法核心
    if quality >= 3:
        # 回忆成功
        if vocab.repetitions == 0:
            vocab.interval_days = 1
        elif vocab.repetitions == 1:
            vocab.interval_days = 6
        else:
            vocab.interval_days = round(vocab.interval_days * vocab.ease_factor)

        vocab.repetitions += 1
    else:
        # 回忆失败，重置
        vocab.repetitions = 0
        vocab.interval_days = 1

    # 更新 ease factor（最低 1.3）
    vocab.ease_factor = max(
        1.3,
        vocab.ease_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
    )

    # 计算下次复习日期
    vocab.next_review_date = date.today() + timedelta(days=vocab.interval_days)

    # 连续5次都评分4+视为掌握
    if vocab.repetitions >= 5 and quality >= 4:
        vocab.is_mastered = True

    db.commit()
    return vocab


def get_today_reviews(db: Session) -> list[VocabItem]:
    """获取今日待复习的单词"""
    return (
        db.query(VocabItem)
        .filter(
            VocabItem.next_review_date <= date.today(),
            VocabItem.is_mastered == False,
        )
        .order_by(VocabItem.next_review_date)
        .all()
    )
