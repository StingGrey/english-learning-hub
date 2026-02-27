"""翻译 & AI 讲解 API"""
from fastapi import APIRouter
from schemas.schemas import TranslateRequest, TranslateResponse, AIExplainRequest
from services.ai_service import translate_text, explain_text, translate_sentences

router = APIRouter()


@router.post("/selection", response_model=TranslateResponse)
def translate_selection(req: TranslateRequest):
    """翻译选中文本"""
    result = translate_text(req.text, req.context or "")
    return TranslateResponse(
        translation=result.get("translation", ""),
        explanation=result.get("explanation", ""),
    )


@router.post("/explain")
def ai_explain(req: AIExplainRequest):
    """AI 讲解选中文本"""
    explanation = explain_text(req.text, req.context or "")
    return {"explanation": explanation}


@router.post("/sentences")
def translate_sentence_batch(sentences: list[str]):
    """批量翻译句子"""
    translations = translate_sentences(sentences)
    return {"translations": translations}
