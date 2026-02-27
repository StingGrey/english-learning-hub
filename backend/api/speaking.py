"""口语陪练 API"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from models.database import get_db
from models.tables import SpeakingSession, SpeakingTurn
from schemas.schemas import SpeakingTurnRequest, SpeakingTurnOut
from services.ai_service import speaking_reply

router = APIRouter()


@router.post("/turn", response_model=SpeakingTurnOut)
def speak_turn(req: SpeakingTurnRequest, db: Session = Depends(get_db)):
    """口语对话一轮"""
    # 获取或创建会话
    if req.session_id:
        session = db.query(SpeakingSession).get(req.session_id)
    else:
        session = SpeakingSession(
            topic="Free conversation",
            scenario=req.scenario or "daily",
        )
        db.add(session)
        db.flush()

    # 保存用户发言
    user_turn = SpeakingTurn(
        session_id=session.id,
        role="user",
        content=req.content,
    )
    db.add(user_turn)
    db.flush()

    # 构建对话历史
    turns = (
        db.query(SpeakingTurn)
        .filter(SpeakingTurn.session_id == session.id)
        .order_by(SpeakingTurn.created_at)
        .all()
    )
    conversation = [{"role": t.role, "content": t.content} for t in turns]

    # AI 回复
    ai_result = speaking_reply(conversation, session.scenario)

    # 保存 AI 回复
    ai_turn = SpeakingTurn(
        session_id=session.id,
        role="assistant",
        content=ai_result["reply"],
        correction=ai_result.get("correction"),
        suggestion=ai_result.get("suggestion"),
    )
    db.add(ai_turn)
    db.commit()

    return SpeakingTurnOut(
        session_id=session.id,
        role="assistant",
        content=ai_result["reply"],
        correction=ai_result.get("correction"),
        suggestion=ai_result.get("suggestion"),
    )


@router.get("/sessions")
def list_sessions(db: Session = Depends(get_db)):
    """获取口语会话列表"""
    sessions = (
        db.query(SpeakingSession)
        .order_by(SpeakingSession.started_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": s.id,
            "topic": s.topic,
            "scenario": s.scenario,
            "started_at": s.started_at.isoformat(),
            "turn_count": len(s.turns),
        }
        for s in sessions
    ]


@router.get("/session/{session_id}/turns")
def get_session_turns(session_id: int, db: Session = Depends(get_db)):
    """获取某个会话的所有对话"""
    turns = (
        db.query(SpeakingTurn)
        .filter(SpeakingTurn.session_id == session_id)
        .order_by(SpeakingTurn.created_at)
        .all()
    )
    return [
        {
            "role": t.role,
            "content": t.content,
            "correction": t.correction,
            "suggestion": t.suggestion,
            "created_at": t.created_at.isoformat(),
        }
        for t in turns
    ]
