"""应用工厂"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from models.database import init_db
from services.scheduler import start_scheduler, shutdown_scheduler
from api import plan, content, vocab, speaking, writing, stats, translate, settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    init_db()
    start_scheduler()
    yield
    shutdown_scheduler()


def create_app() -> FastAPI:
    app = FastAPI(
        title="AI English Learning Hub",
        version="1.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 注册路由
    app.include_router(plan.router, prefix="/api/plan", tags=["plan"])
    app.include_router(content.router, prefix="/api/content", tags=["content"])
    app.include_router(translate.router, prefix="/api/translate", tags=["translate"])
    app.include_router(vocab.router, prefix="/api/vocab", tags=["vocab"])
    app.include_router(speaking.router, prefix="/api/speaking", tags=["speaking"])
    app.include_router(writing.router, prefix="/api/writing", tags=["writing"])
    app.include_router(stats.router, prefix="/api/stats", tags=["stats"])
    app.include_router(settings.router, prefix="/api/settings", tags=["settings"])

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    return app
