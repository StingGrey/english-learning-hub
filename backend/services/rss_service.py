"""RSS 抓取服务 —— 从预置 RSS 源获取英文文章"""
import re
import feedparser
import httpx
from datetime import datetime
from sqlalchemy.orm import Session

from models.tables import NewsSource, Article, ArticleSentence
from services.ai_service import generate_summary


def fetch_all_sources(db: Session):
    """抓取所有活跃 RSS 源的文章"""
    sources = db.query(NewsSource).filter(NewsSource.is_active == True).all()
    total_new = 0
    for source in sources:
        try:
            count = _fetch_source(db, source)
            total_new += count
            source.last_fetched = datetime.utcnow()
        except Exception as e:
            print(f"[RSS] 抓取 {source.name} 失败: {e}")
    db.commit()
    return total_new


def _fetch_source(db: Session, source: NewsSource) -> int:
    """抓取单个 RSS 源"""
    feed = feedparser.parse(source.url)
    new_count = 0

    for entry in feed.entries[:20]:  # 每个源最多20篇
        url = entry.get("link", "")
        if not url:
            continue

        # 去重
        existing = db.query(Article).filter(Article.url == url).first()
        if existing:
            continue

        title = entry.get("title", "Untitled")
        # 从 RSS 获取摘要内容
        content = entry.get("content", [{}])[0].get("value", "") if entry.get("content") else ""
        if not content:
            content = entry.get("summary", entry.get("description", ""))

        # 清理 HTML 标签
        content = _strip_html(content)
        if len(content) < 100:
            continue

        # 计算可读性和难度
        word_count = len(content.split())
        readability = _flesch_reading_ease(content)
        difficulty = _score_to_difficulty(readability)

        # 拆分句子
        sentences = _split_sentences(content)

        article = Article(
            source_id=source.id,
            title=title,
            url=url,
            content=content,
            difficulty=difficulty,
            category=source.category,
            word_count=word_count,
            readability_score=readability,
            published_at=_parse_date(entry),
        )
        db.add(article)
        db.flush()  # 获取 article.id

        # 保存句子
        for i, sent in enumerate(sentences):
            if sent.strip():
                db.add(ArticleSentence(
                    article_id=article.id,
                    index=i,
                    text_en=sent.strip(),
                ))

        new_count += 1

    return new_count


def recommend_articles(db: Session, count: int = 5) -> list[Article]:
    """推荐今日可学文章：优先未读、混合难度"""
    articles = (
        db.query(Article)
        .filter(Article.is_read == False)
        .order_by(Article.published_at.desc())
        .limit(count * 3)
        .all()
    )

    if not articles:
        return []

    # 混合难度：尝试各取一些
    by_diff = {"easy": [], "medium": [], "hard": []}
    for a in articles:
        by_diff.get(a.difficulty, by_diff["medium"]).append(a)

    result = []
    for diff in ["medium", "easy", "hard"]:
        for a in by_diff[diff]:
            if len(result) >= count:
                break
            result.append(a)
        if len(result) >= count:
            break

    # 标记为推荐
    for a in result:
        a.is_recommended = True
    db.commit()

    return result


def generate_article_summary(db: Session, article_id: int):
    """为文章生成 AI 摘要"""
    article = db.query(Article).get(article_id)
    if article and article.content and not article.summary:
        article.summary = generate_summary(article.content)
        db.commit()


def _flesch_reading_ease(text: str) -> float:
    """内置 Flesch Reading Ease 计算（避免 textstat 依赖）"""
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    words = text.split()
    if not sentences or not words:
        return 50.0

    total_sentences = len(sentences)
    total_words = len(words)

    # 简单音节计数
    total_syllables = 0
    for word in words:
        word = word.lower().strip(".,!?;:\"'()-")
        count = 0
        vowels = "aeiouy"
        prev_vowel = False
        for ch in word:
            is_vowel = ch in vowels
            if is_vowel and not prev_vowel:
                count += 1
            prev_vowel = is_vowel
        if word.endswith("e") and count > 1:
            count -= 1
        total_syllables += max(count, 1)

    score = 206.835 - 1.015 * (total_words / total_sentences) - 84.6 * (total_syllables / total_words)
    return max(0, min(100, score))


def _strip_html(text: str) -> str:
    """移除 HTML 标签"""
    return re.sub(r"<[^>]+>", "", text).strip()


def _split_sentences(text: str) -> list[str]:
    """将文本拆分为句子"""
    # 按照句号、感叹号、问号拆分，保留缩写
    sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)
    return [s for s in sentences if len(s.strip()) > 5]


def _score_to_difficulty(score: float) -> str:
    """Flesch-Kincaid 分数转换为难度等级"""
    if score >= 70:
        return "easy"
    elif score >= 40:
        return "medium"
    else:
        return "hard"


def _parse_date(entry) -> datetime | None:
    """解析 RSS entry 的日期"""
    for field in ["published_parsed", "updated_parsed"]:
        parsed = entry.get(field)
        if parsed:
            try:
                return datetime(*parsed[:6])
            except Exception:
                pass
    return None
