"""生词本 & 复习 API"""
from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from models.database import get_db
from models.tables import VocabItem
from schemas.schemas import VocabMarkRequest, VocabItemOut, VocabReviewRequest
from services.ai_service import get_word_definition
from services.review_service import process_review, get_today_reviews

router = APIRouter()


@router.post("/mark", response_model=VocabItemOut)
def mark_vocab(req: VocabMarkRequest, db: Session = Depends(get_db)):
    """标记生词"""
    # 检查是否已存在
    existing = db.query(VocabItem).filter(VocabItem.word == req.word).first()
    if existing:
        return existing

    # 如果缺少释义信息，通过 AI 补全
    word_info = {}
    if not req.definition:
        try:
            word_info = get_word_definition(req.word, req.example_sentence or "")
        except Exception:
            pass

    vocab = VocabItem(
        word=req.word,
        lemma=req.lemma or word_info.get("lemma", req.word),
        pos=req.pos or word_info.get("pos", ""),
        definition=req.definition or word_info.get("definition", ""),
        definition_en=req.definition_en or word_info.get("definition_en", ""),
        example_sentence=req.example_sentence,
        article_id=req.article_id,
        pronunciation=word_info.get("pronunciation", ""),
        next_review_date=date.today(),
    )
    db.add(vocab)
    db.commit()
    db.refresh(vocab)
    return vocab


@router.get("/list", response_model=list[VocabItemOut])
def list_vocab(
    mastered: bool | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """获取生词列表"""
    query = db.query(VocabItem).order_by(VocabItem.created_at.desc())
    if mastered is not None:
        query = query.filter(VocabItem.is_mastered == mastered)
    return query.offset(offset).limit(limit).all()


@router.get("/review/today", response_model=list[VocabItemOut])
def get_review_list(db: Session = Depends(get_db)):
    """获取今日待复习列表"""
    return get_today_reviews(db)


@router.post("/review/{vocab_id}", response_model=VocabItemOut)
def submit_review(vocab_id: int, req: VocabReviewRequest, db: Session = Depends(get_db)):
    """提交复习结果"""
    vocab = process_review(db, vocab_id, req.quality)
    return vocab


@router.delete("/{vocab_id}")
def delete_vocab(vocab_id: int, db: Session = Depends(get_db)):
    """删除生词"""
    vocab = db.query(VocabItem).get(vocab_id)
    if vocab:
        db.delete(vocab)
        db.commit()
    return {"ok": True}
