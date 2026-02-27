"""设置 API"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from models.database import get_db
from models.tables import UserProfile
from schemas.schemas import SettingsUpdate, SettingsOut

router = APIRouter()


@router.get("/", response_model=SettingsOut)
def get_settings(db: Session = Depends(get_db)):
    """获取用户设置"""
    profile = db.query(UserProfile).first()
    if not profile:
        profile = UserProfile(goal="general", daily_minutes=30)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.put("/", response_model=SettingsOut)
def update_settings(req: SettingsUpdate, db: Session = Depends(get_db)):
    """更新用户设置"""
    profile = db.query(UserProfile).first()
    if not profile:
        profile = UserProfile()
        db.add(profile)

    if req.goal is not None:
        profile.goal = req.goal
    if req.daily_minutes is not None:
        profile.daily_minutes = req.daily_minutes

    db.commit()
    db.refresh(profile)
    return profile
