"""后端 API Smoke Tests"""
import pytest
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# 使用测试数据库
os.environ["DATABASE_URL"] = "sqlite:///./data/test.db"

# 确保 data 目录存在
os.makedirs("data", exist_ok=True)

from models.database import init_db
from app import create_app
from fastapi.testclient import TestClient

# 初始化数据库（创建表和种子数据）
init_db()

app = create_app()
client = TestClient(app)


def test_health():
    """健康检查"""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_get_settings():
    """获取设置"""
    resp = client.get("/api/settings/")
    assert resp.status_code == 200
    data = resp.json()
    assert "goal" in data
    assert "daily_minutes" in data


def test_update_settings():
    """更新设置"""
    resp = client.put("/api/settings/", json={"goal": "speaking", "daily_minutes": 45})
    assert resp.status_code == 200
    assert resp.json()["goal"] == "speaking"


def test_get_today_plan_empty():
    """获取今日计划（初始为空）"""
    resp = client.get("/api/plan/today")
    assert resp.status_code == 200


def test_list_articles():
    """获取文章列表"""
    resp = client.get("/api/content/articles")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_vocab_list():
    """获取生词列表"""
    resp = client.get("/api/vocab/list")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_vocab_mark():
    """标记生词（不依赖 AI）"""
    resp = client.post("/api/vocab/mark", json={
        "word": "ubiquitous",
        "lemma": "ubiquitous",
        "pos": "adj",
        "definition": "无处不在的",
        "definition_en": "present, appearing, or found everywhere",
        "example_sentence": "Smartphones have become ubiquitous in modern society.",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["word"] == "ubiquitous"


def test_vocab_review_today():
    """获取今日待复习"""
    resp = client.get("/api/vocab/review/today")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_stats_today():
    """获取今日统计"""
    resp = client.get("/api/stats/today")
    assert resp.status_code == 200
    data = resp.json()
    assert "tasks_done" in data


def test_stats_weekly():
    """获取周统计"""
    resp = client.get("/api/stats/weekly")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_tasks" in data


def test_speaking_sessions():
    """获取口语会话列表"""
    resp = client.get("/api/speaking/sessions")
    assert resp.status_code == 200


def test_writing_history():
    """获取写作历史"""
    resp = client.get("/api/writing/history")
    assert resp.status_code == 200
