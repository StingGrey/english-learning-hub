"""AI 服务统一封装 —— 支持对话、翻译、写作批改、讲解"""
import json
from openai import OpenAI
from config import settings


def _get_client() -> OpenAI:
    return OpenAI(api_key=settings.ai_api_key, base_url=settings.ai_base_url)


def _chat(messages: list[dict], temperature: float = 0.7) -> str:
    """通用聊天补全"""
    client = _get_client()
    response = client.chat.completions.create(
        model=settings.ai_model,
        messages=messages,
        temperature=temperature,
    )
    return response.choices[0].message.content or ""


def translate_text(text: str, context: str = "") -> dict:
    """翻译选中文本，返回翻译和简要解释"""
    prompt = f"""请翻译以下英文为中文。如果有上下文，请结合上下文理解含义。
返回 JSON 格式: {{"translation": "中文翻译", "explanation": "简要语法/用法解释（如有必要）"}}

上下文: {context}
待翻译文本: {text}"""

    result = _chat([{"role": "user", "content": prompt}], temperature=0.3)
    try:
        return json.loads(result.strip().removeprefix("```json").removesuffix("```").strip())
    except json.JSONDecodeError:
        return {"translation": result, "explanation": ""}


def explain_text(text: str, context: str = "") -> str:
    """AI 讲解选中文本的语法、用法、搭配"""
    prompt = f"""请用中文详细讲解以下英文文本的语法结构、关键词汇用法和搭配。
要求简洁明了，适合英语学习者阅读。

上下文: {context}
待讲解文本: {text}"""

    return _chat([{"role": "user", "content": prompt}], temperature=0.5)


def translate_sentences(sentences: list[str]) -> list[str]:
    """批量翻译句子列表"""
    if not sentences:
        return []

    prompt = f"""请逐句翻译以下英文句子为中文，保持序号对应。
只返回翻译结果，每行一个，不要序号。

{chr(10).join(f'{i+1}. {s}' for i, s in enumerate(sentences))}"""

    result = _chat([{"role": "user", "content": prompt}], temperature=0.3)
    translations = [line.strip() for line in result.strip().split("\n") if line.strip()]

    # 补齐缺失翻译
    while len(translations) < len(sentences):
        translations.append("")
    return translations[:len(sentences)]


def get_word_definition(word: str, sentence: str = "") -> dict:
    """获取单词释义、词性、词形还原"""
    prompt = f"""分析以下英语单词，返回 JSON 格式:
{{
  "word": "原始单词",
  "lemma": "词形还原（原形）",
  "pos": "词性（noun/verb/adj/adv/prep/conj/pron/det）",
  "definition": "中文释义",
  "definition_en": "英文释义",
  "pronunciation": "音标"
}}

单词: {word}
来源句子: {sentence}"""

    result = _chat([{"role": "user", "content": prompt}], temperature=0.3)
    try:
        return json.loads(result.strip().removeprefix("```json").removesuffix("```").strip())
    except json.JSONDecodeError:
        return {
            "word": word, "lemma": word, "pos": "",
            "definition": "", "definition_en": "", "pronunciation": ""
        }


def generate_summary(text: str) -> str:
    """生成文章摘要"""
    prompt = f"""请用1-2句中文概括以下英文文章的核心内容：

{text[:3000]}"""
    return _chat([{"role": "user", "content": prompt}], temperature=0.5)


def generate_plan_tasks(goal: str, daily_minutes: int) -> list[dict]:
    """根据学习目标生成今日任务列表"""
    prompt = f"""作为英语学习规划师，为以下学习者生成今日学习任务列表。
返回 JSON 数组格式: [{{"title": "任务名称", "task_type": "类型", "duration_minutes": 分钟数}}]

task_type 可选: reading, vocab_review, speaking, writing, listening, grammar

学习目标: {goal}
可用时间: {daily_minutes} 分钟

要求：
- 任务总时长不超过 {daily_minutes} 分钟
- 任务数量 3-6 个
- 包含至少1个阅读任务和1个复习任务
- 任务名称用中文"""

    result = _chat([{"role": "user", "content": prompt}], temperature=0.7)
    try:
        return json.loads(result.strip().removeprefix("```json").removesuffix("```").strip())
    except json.JSONDecodeError:
        # 返回默认计划
        return [
            {"title": "阅读一篇外刊文章", "task_type": "reading", "duration_minutes": 15},
            {"title": "复习今日生词", "task_type": "vocab_review", "duration_minutes": 10},
            {"title": "口语对话练习", "task_type": "speaking", "duration_minutes": 5},
        ]


def speaking_reply(conversation: list[dict], scenario: str = "daily") -> dict:
    """口语陪练：生成回复 + 纠错 + 替代表达"""
    system = f"""你是一个友好的英语口语陪练伙伴。场景：{scenario}。
规则：
1. 用英文回复用户，保持对话自然流畅
2. 如果用户的英文有语法或表达错误，在回复后指出
3. 返回 JSON 格式:
{{
  "reply": "你的英文回复",
  "correction": "对用户上一句话的纠错（如有错误）或 null",
  "suggestion": "更地道的替代表达建议（如有）或 null"
}}"""

    messages = [{"role": "system", "content": system}] + conversation
    result = _chat(messages, temperature=0.8)
    try:
        return json.loads(result.strip().removeprefix("```json").removesuffix("```").strip())
    except json.JSONDecodeError:
        return {"reply": result, "correction": None, "suggestion": None}


def evaluate_writing(title: str, content: str) -> dict:
    """写作批改：语法纠错 + 表达优化 + 结构建议 + 评分"""
    prompt = f"""作为专业英语写作教师，请批改以下作文并返回 JSON 格式:
{{
  "score": 0-100分,
  "grammar_issues": "语法问题列表（用中文解释每个问题）",
  "expression_suggestions": "表达优化建议",
  "structure_feedback": "结构与逻辑建议",
  "overall_comment": "总体评价（中文）",
  "improved_version": "修改后的完整版本"
}}

标题: {title or '无标题'}
作文内容:
{content}"""

    result = _chat([{"role": "user", "content": prompt}], temperature=0.5)
    try:
        return json.loads(result.strip().removeprefix("```json").removesuffix("```").strip())
    except json.JSONDecodeError:
        return {
            "score": None,
            "grammar_issues": result,
            "expression_suggestions": "",
            "structure_feedback": "",
            "overall_comment": "",
            "improved_version": "",
        }
