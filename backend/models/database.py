"""数据库引擎与会话管理"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from config import settings

# 确保 data 目录存在
os.makedirs("data", exist_ok=True)

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},  # SQLite 需要
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def init_db():
    """创建所有表"""
    from models.tables import (  # noqa: F401 确保模型被导入
        UserProfile, DailyPlan, PlanTask, StudySession,
        NewsSource, Article, ArticleSentence,
        VocabItem, VocabReview,
        SpeakingSession, SpeakingTurn,
        WritingSubmission, WritingFeedback,
    )
    Base.metadata.create_all(bind=engine)
    # 初始化默认用户 profile 和 RSS 源
    _seed_defaults()


def _seed_defaults():
    """填充默认数据"""
    db = SessionLocal()
    try:
        from models.tables import UserProfile, NewsSource

        # 创建默认用户
        if not db.query(UserProfile).first():
            db.add(UserProfile(
                goal="general",
                daily_minutes=30,
            ))

        # 预置 RSS 源
        if not db.query(NewsSource).first():
            sources = [
                NewsSource(name="BBC News", url="https://feeds.bbci.co.uk/news/world/rss.xml", category="world"),
                NewsSource(name="Reuters", url="https://feeds.reuters.com/reuters/topNews", category="world"),
                NewsSource(name="NPR", url="https://feeds.npr.org/1001/rss.xml", category="general"),
                NewsSource(name="The Guardian", url="https://www.theguardian.com/world/rss", category="world"),
                NewsSource(name="AP News", url="https://rsshub.app/apnews/topics/apf-topnews", category="world"),
            ]
            db.add_all(sources)

        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


def get_db():
    """FastAPI 依赖注入：获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
