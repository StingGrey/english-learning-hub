"""文章内容 API"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from models.database import get_db
from models.tables import Article, ArticleSentence
from schemas.schemas import ArticleOut, ArticleDetailOut
from services.rss_service import fetch_all_sources, recommend_articles, generate_article_summary

router = APIRouter()


@router.post("/fetch")
def fetch_content(db: Session = Depends(get_db)):
    """手动触发抓取 RSS"""
    count = fetch_all_sources(db)
    return {"new_articles": count}


@router.get("/recommend", response_model=list[ArticleOut])
def get_recommendations(count: int = Query(5, ge=1, le=20), db: Session = Depends(get_db)):
    """获取推荐文章"""
    articles = recommend_articles(db, count)
    result = []
    for a in articles:
        result.append(ArticleOut(
            id=a.id,
            title=a.title,
            url=a.url,
            summary=a.summary,
            difficulty=a.difficulty,
            category=a.category,
            word_count=a.word_count,
            is_read=a.is_read,
            published_at=a.published_at,
            source_name=a.source.name if a.source else None,
        ))
    return result


@router.get("/articles", response_model=list[ArticleOut])
def list_articles(
    difficulty: str | None = None,
    category: str | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """文章列表"""
    query = db.query(Article).order_by(Article.published_at.desc())
    if difficulty:
        query = query.filter(Article.difficulty == difficulty)
    if category:
        query = query.filter(Article.category == category)
    articles = query.offset(offset).limit(limit).all()
    return [
        ArticleOut(
            id=a.id, title=a.title, url=a.url, summary=a.summary,
            difficulty=a.difficulty, category=a.category, word_count=a.word_count,
            is_read=a.is_read, published_at=a.published_at,
            source_name=a.source.name if a.source else None,
        )
        for a in articles
    ]


@router.get("/article/{article_id}", response_model=ArticleDetailOut)
def get_article(article_id: int, db: Session = Depends(get_db)):
    """获取文章详情"""
    article = db.query(Article).get(article_id)
    if not article:
        return {"error": "Not found"}

    # 标记已读
    article.is_read = True
    db.commit()

    # 如果没有摘要，异步生成（首次访问时）
    if not article.summary and article.content:
        try:
            generate_article_summary(db, article_id)
            db.refresh(article)
        except Exception:
            pass

    sentences = [
        {"index": s.index, "text_en": s.text_en, "text_zh": s.text_zh or ""}
        for s in sorted(article.sentences, key=lambda x: x.index)
    ]

    return ArticleDetailOut(
        id=article.id,
        title=article.title,
        url=article.url,
        content=article.content,
        summary=article.summary,
        difficulty=article.difficulty,
        category=article.category,
        word_count=article.word_count,
        is_read=article.is_read,
        sentences=sentences,
    )
