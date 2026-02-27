"""学习统计 API"""
from datetime import date, timedelta, datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from models.database import get_db
from models.tables import PlanTask, StudySession, VocabItem, VocabReview, DailyPlan
from schemas.schemas import WeeklyStatsOut

router = APIRouter()


@router.get("/weekly", response_model=WeeklyStatsOut)
def get_weekly_stats(db: Session = Depends(get_db)):
    """获取近7天学习统计"""
    today = date.today()
    week_ago = today - timedelta(days=6)

    # 任务统计
    total_tasks = (
        db.query(PlanTask)
        .join(DailyPlan)
        .filter(DailyPlan.plan_date >= week_ago)
        .count()
    )
    completed_tasks = (
        db.query(PlanTask)
        .join(DailyPlan)
        .filter(DailyPlan.plan_date >= week_ago, PlanTask.is_completed == True)
        .count()
    )

    # 学习时长（分钟）
    sessions = (
        db.query(StudySession)
        .filter(StudySession.started_at >= datetime.combine(week_ago, datetime.min.time()))
        .all()
    )
    total_minutes = sum(s.duration_seconds for s in sessions) / 60

    # 新增生词数
    new_vocab = (
        db.query(VocabItem)
        .filter(VocabItem.created_at >= datetime.combine(week_ago, datetime.min.time()))
        .count()
    )

    # 复习统计
    reviews = (
        db.query(VocabReview)
        .filter(VocabReview.reviewed_at >= datetime.combine(week_ago, datetime.min.time()))
        .count()
    )

    # 今日待复习总数
    today_due = (
        db.query(VocabItem)
        .filter(VocabItem.next_review_date <= today, VocabItem.is_mastered == False)
        .count()
    )
    today_reviewed = (
        db.query(VocabReview)
        .filter(VocabReview.reviewed_at >= datetime.combine(today, datetime.min.time()))
        .count()
    )
    review_rate = today_reviewed / max(today_due + today_reviewed, 1)

    # 每日分解
    daily = []
    for i in range(7):
        d = week_ago + timedelta(days=i)
        day_tasks = (
            db.query(PlanTask)
            .join(DailyPlan)
            .filter(DailyPlan.plan_date == d, PlanTask.is_completed == True)
            .count()
        )
        day_vocab = (
            db.query(VocabItem)
            .filter(
                VocabItem.created_at >= datetime.combine(d, datetime.min.time()),
                VocabItem.created_at < datetime.combine(d + timedelta(days=1), datetime.min.time()),
            )
            .count()
        )
        daily.append({
            "date": d.isoformat(),
            "completed_tasks": day_tasks,
            "new_vocab": day_vocab,
        })

    return WeeklyStatsOut(
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        total_study_minutes=round(total_minutes, 1),
        new_vocab_count=new_vocab,
        review_count=reviews,
        review_completion_rate=round(review_rate, 2),
        daily_breakdown=daily,
    )


@router.get("/today")
def get_today_stats(db: Session = Depends(get_db)):
    """获取今日统计概要"""
    today = date.today()

    # 今日任务完成数
    plan = db.query(DailyPlan).filter(DailyPlan.plan_date == today).first()
    tasks_done = 0
    tasks_total = 0
    if plan:
        tasks_total = len(plan.tasks)
        tasks_done = sum(1 for t in plan.tasks if t.is_completed)

    # 今日新词数
    new_vocab = (
        db.query(VocabItem)
        .filter(VocabItem.created_at >= datetime.combine(today, datetime.min.time()))
        .count()
    )

    # 待复习数
    due_review = (
        db.query(VocabItem)
        .filter(VocabItem.next_review_date <= today, VocabItem.is_mastered == False)
        .count()
    )

    return {
        "tasks_done": tasks_done,
        "tasks_total": tasks_total,
        "new_vocab": new_vocab,
        "due_review": due_review,
    }
