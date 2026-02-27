"""写作批改 API"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from models.database import get_db
from models.tables import WritingSubmission, WritingFeedback
from schemas.schemas import WritingEvaluateRequest, WritingFeedbackOut
from services.ai_service import evaluate_writing

router = APIRouter()


@router.post("/evaluate", response_model=WritingFeedbackOut)
def evaluate(req: WritingEvaluateRequest, db: Session = Depends(get_db)):
    """提交作文并获取批改"""
    word_count = len(req.content.split())

    submission = WritingSubmission(
        title=req.title or "Untitled",
        content=req.content,
        word_count=word_count,
    )
    db.add(submission)
    db.flush()

    # AI 批改
    result = evaluate_writing(req.title or "", req.content)

    feedback = WritingFeedback(
        submission_id=submission.id,
        score=result.get("score"),
        grammar_issues=result.get("grammar_issues", ""),
        expression_suggestions=result.get("expression_suggestions", ""),
        structure_feedback=result.get("structure_feedback", ""),
        overall_comment=result.get("overall_comment", ""),
        improved_version=result.get("improved_version", ""),
    )
    db.add(feedback)
    db.commit()

    return WritingFeedbackOut(
        submission_id=submission.id,
        score=feedback.score,
        grammar_issues=feedback.grammar_issues,
        expression_suggestions=feedback.expression_suggestions,
        structure_feedback=feedback.structure_feedback,
        overall_comment=feedback.overall_comment,
        improved_version=feedback.improved_version,
    )


@router.get("/history")
def get_history(db: Session = Depends(get_db)):
    """获取写作历史"""
    submissions = (
        db.query(WritingSubmission)
        .order_by(WritingSubmission.submitted_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": s.id,
            "title": s.title,
            "word_count": s.word_count,
            "submitted_at": s.submitted_at.isoformat(),
            "score": s.feedback.score if s.feedback else None,
        }
        for s in submissions
    ]
