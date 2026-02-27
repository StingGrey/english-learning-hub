"""学习计划 API"""
from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from models.database import get_db
from models.tables import DailyPlan, PlanTask, UserProfile
from schemas.schemas import PlanGenerateRequest, DailyPlanOut
from services.ai_service import generate_plan_tasks

router = APIRouter()


@router.post("/generate", response_model=DailyPlanOut)
def generate_plan(req: PlanGenerateRequest, db: Session = Depends(get_db)):
    """生成今日学习计划"""
    # 获取用户设置
    profile = db.query(UserProfile).first()
    goal = req.goal or (profile.goal if profile else "general")
    daily_minutes = req.daily_minutes or (profile.daily_minutes if profile else 30)

    # 检查今日是否已有计划
    today = date.today()
    existing = db.query(DailyPlan).filter(DailyPlan.plan_date == today).first()
    if existing:
        # 删除旧计划重新生成
        db.delete(existing)
        db.flush()

    # AI 生成任务
    tasks_data = generate_plan_tasks(goal, daily_minutes)

    plan = DailyPlan(plan_date=today, goal=goal, total_minutes=daily_minutes)
    db.add(plan)
    db.flush()

    for t in tasks_data:
        db.add(PlanTask(
            plan_id=plan.id,
            title=t["title"],
            task_type=t.get("task_type", "reading"),
            duration_minutes=t.get("duration_minutes", 10),
        ))

    db.commit()
    db.refresh(plan)
    return plan


@router.get("/today", response_model=DailyPlanOut | None)
def get_today_plan(db: Session = Depends(get_db)):
    """获取今日计划"""
    plan = db.query(DailyPlan).filter(DailyPlan.plan_date == date.today()).first()
    return plan


@router.post("/task/{task_id}/complete")
def complete_task(task_id: int, db: Session = Depends(get_db)):
    """标记任务完成"""
    from datetime import datetime
    task = db.query(PlanTask).get(task_id)
    if not task:
        return {"error": "Task not found"}
    task.is_completed = True
    task.completed_at = datetime.utcnow()
    db.commit()
    return {"ok": True}
