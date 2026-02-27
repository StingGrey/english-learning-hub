"""所有数据库表定义"""
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean,
    DateTime, Date, ForeignKey, Enum,
)
from sqlalchemy.orm import relationship
from models.database import Base


class UserProfile(Base):
    """用户配置（单用户）"""
    __tablename__ = "user_profile"

    id = Column(Integer, primary_key=True, default=1)
    goal = Column(String(50), default="general")          # general / speaking / exam / work
    daily_minutes = Column(Integer, default=30)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DailyPlan(Base):
    """每日学习计划"""
    __tablename__ = "daily_plan"

    id = Column(Integer, primary_key=True, autoincrement=True)
    plan_date = Column(Date, default=date.today, unique=True)
    goal = Column(String(50))
    total_minutes = Column(Integer, default=30)
    created_at = Column(DateTime, default=datetime.utcnow)

    tasks = relationship("PlanTask", back_populates="plan", cascade="all, delete-orphan")


class PlanTask(Base):
    """计划中的具体任务"""
    __tablename__ = "plan_task"

    id = Column(Integer, primary_key=True, autoincrement=True)
    plan_id = Column(Integer, ForeignKey("daily_plan.id"), nullable=False)
    title = Column(String(200), nullable=False)
    task_type = Column(String(50))       # reading / vocab_review / speaking / writing
    duration_minutes = Column(Integer, default=10)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)

    plan = relationship("DailyPlan", back_populates="tasks")


class StudySession(Base):
    """学习时段记录"""
    __tablename__ = "study_session"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_type = Column(String(50))    # reading / vocab / speaking / writing
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, default=0)
    notes = Column(Text, nullable=True)


class NewsSource(Base):
    """RSS 新闻源"""
    __tablename__ = "news_source"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    url = Column(String(500), nullable=False, unique=True)
    category = Column(String(50), default="general")
    is_active = Column(Boolean, default=True)
    last_fetched = Column(DateTime, nullable=True)

    articles = relationship("Article", back_populates="source")


class Article(Base):
    """抓取的文章"""
    __tablename__ = "article"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_id = Column(Integer, ForeignKey("news_source.id"))
    title = Column(String(500), nullable=False)
    url = Column(String(1000), unique=True)
    content = Column(Text)
    summary = Column(Text)
    difficulty = Column(String(20), default="medium")   # easy / medium / hard
    category = Column(String(50))
    word_count = Column(Integer, default=0)
    readability_score = Column(Float, nullable=True)     # Flesch-Kincaid
    is_recommended = Column(Boolean, default=False)
    is_read = Column(Boolean, default=False)
    published_at = Column(DateTime, nullable=True)
    fetched_at = Column(DateTime, default=datetime.utcnow)

    source = relationship("NewsSource", back_populates="articles")
    sentences = relationship("ArticleSentence", back_populates="article", cascade="all, delete-orphan")


class ArticleSentence(Base):
    """文章逐句拆分（用于对照翻译）"""
    __tablename__ = "article_sentence"

    id = Column(Integer, primary_key=True, autoincrement=True)
    article_id = Column(Integer, ForeignKey("article.id"), nullable=False)
    index = Column(Integer)              # 句子在文章中的顺序
    text_en = Column(Text, nullable=False)
    text_zh = Column(Text, nullable=True)

    article = relationship("Article", back_populates="sentences")


class VocabItem(Base):
    """生词条目"""
    __tablename__ = "vocab_item"

    id = Column(Integer, primary_key=True, autoincrement=True)
    word = Column(String(200), nullable=False)
    lemma = Column(String(200))          # 词形还原
    pos = Column(String(50))             # 词性 noun/verb/adj/adv...
    definition = Column(Text)            # 中文释义
    definition_en = Column(Text)         # 英文释义
    example_sentence = Column(Text)      # 来源句子
    article_id = Column(Integer, ForeignKey("article.id"), nullable=True)
    pronunciation = Column(String(200), nullable=True)

    # SM-2 复习参数
    ease_factor = Column(Float, default=2.5)
    interval_days = Column(Integer, default=1)
    repetitions = Column(Integer, default=0)
    next_review_date = Column(Date, default=date.today)

    is_mastered = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    reviews = relationship("VocabReview", back_populates="vocab", cascade="all, delete-orphan")


class VocabReview(Base):
    """单词复习记录"""
    __tablename__ = "vocab_review"

    id = Column(Integer, primary_key=True, autoincrement=True)
    vocab_id = Column(Integer, ForeignKey("vocab_item.id"), nullable=False)
    quality = Column(Integer)            # 0-5 回忆质量评分
    reviewed_at = Column(DateTime, default=datetime.utcnow)

    vocab = relationship("VocabItem", back_populates="reviews")


class SpeakingSession(Base):
    """口语陪练会话"""
    __tablename__ = "speaking_session"

    id = Column(Integer, primary_key=True, autoincrement=True)
    topic = Column(String(200))
    scenario = Column(String(200))       # 场景：日常/面试/旅行
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)

    turns = relationship("SpeakingTurn", back_populates="session", cascade="all, delete-orphan")


class SpeakingTurn(Base):
    """口语对话轮次"""
    __tablename__ = "speaking_turn"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("speaking_session.id"), nullable=False)
    role = Column(String(20))            # user / assistant
    content = Column(Text, nullable=False)
    correction = Column(Text, nullable=True)         # 纠错
    suggestion = Column(Text, nullable=True)          # 替代表达
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("SpeakingSession", back_populates="turns")


class WritingSubmission(Base):
    """写作提交"""
    __tablename__ = "writing_submission"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200))
    content = Column(Text, nullable=False)
    word_count = Column(Integer, default=0)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    feedback = relationship("WritingFeedback", back_populates="submission", uselist=False)


class WritingFeedback(Base):
    """写作批改反馈"""
    __tablename__ = "writing_feedback"

    id = Column(Integer, primary_key=True, autoincrement=True)
    submission_id = Column(Integer, ForeignKey("writing_submission.id"), nullable=False)
    score = Column(Float)                # 0-100
    grammar_issues = Column(Text)        # JSON 格式的语法问题列表
    expression_suggestions = Column(Text) # 表达优化建议
    structure_feedback = Column(Text)     # 结构建议
    overall_comment = Column(Text)        # 总评
    improved_version = Column(Text)       # 改进版本
    created_at = Column(DateTime, default=datetime.utcnow)

    submission = relationship("WritingSubmission", back_populates="feedback")
