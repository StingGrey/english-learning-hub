"""Pydantic 请求/响应模型"""
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


# ─── Plan ───
class PlanGenerateRequest(BaseModel):
    goal: Optional[str] = None
    daily_minutes: Optional[int] = None

class PlanTaskOut(BaseModel):
    id: int
    title: str
    task_type: str
    duration_minutes: int
    is_completed: bool
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class DailyPlanOut(BaseModel):
    id: int
    plan_date: date
    goal: str
    total_minutes: int
    tasks: list[PlanTaskOut]

    class Config:
        from_attributes = True


# ─── Article ───
class ArticleOut(BaseModel):
    id: int
    title: str
    url: Optional[str] = None
    summary: Optional[str] = None
    difficulty: str
    category: Optional[str] = None
    word_count: int
    is_read: bool
    published_at: Optional[datetime] = None
    source_name: Optional[str] = None

    class Config:
        from_attributes = True

class ArticleDetailOut(BaseModel):
    id: int
    title: str
    url: Optional[str] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    difficulty: str
    category: Optional[str] = None
    word_count: int
    is_read: bool
    sentences: list[dict] = []

    class Config:
        from_attributes = True


# ─── Translate ───
class TranslateRequest(BaseModel):
    text: str
    context: Optional[str] = None  # 上下文句子

class TranslateResponse(BaseModel):
    translation: str
    explanation: Optional[str] = None

class AIExplainRequest(BaseModel):
    text: str
    context: Optional[str] = None


# ─── Vocab ───
class VocabMarkRequest(BaseModel):
    word: str
    lemma: Optional[str] = None
    pos: Optional[str] = None
    definition: Optional[str] = None
    definition_en: Optional[str] = None
    example_sentence: Optional[str] = None
    article_id: Optional[int] = None

class VocabItemOut(BaseModel):
    id: int
    word: str
    lemma: Optional[str] = None
    pos: Optional[str] = None
    definition: Optional[str] = None
    definition_en: Optional[str] = None
    example_sentence: Optional[str] = None
    ease_factor: float
    interval_days: int
    repetitions: int
    next_review_date: date
    is_mastered: bool
    created_at: datetime

    class Config:
        from_attributes = True

class VocabReviewRequest(BaseModel):
    quality: int  # 0-5


# ─── Speaking ───
class SpeakingTurnRequest(BaseModel):
    session_id: Optional[int] = None
    content: str
    scenario: Optional[str] = "daily"  # daily / interview / travel

class SpeakingTurnOut(BaseModel):
    session_id: int
    role: str
    content: str
    correction: Optional[str] = None
    suggestion: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Writing ───
class WritingEvaluateRequest(BaseModel):
    title: Optional[str] = None
    content: str

class WritingFeedbackOut(BaseModel):
    submission_id: int
    score: Optional[float] = None
    grammar_issues: Optional[str] = None
    expression_suggestions: Optional[str] = None
    structure_feedback: Optional[str] = None
    overall_comment: Optional[str] = None
    improved_version: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Stats ───
class WeeklyStatsOut(BaseModel):
    total_tasks: int
    completed_tasks: int
    total_study_minutes: float
    new_vocab_count: int
    review_count: int
    review_completion_rate: float
    daily_breakdown: list[dict]


# ─── Settings ───
class SettingsUpdate(BaseModel):
    goal: Optional[str] = None
    daily_minutes: Optional[int] = None

class SettingsOut(BaseModel):
    goal: str
    daily_minutes: int

    class Config:
        from_attributes = True
