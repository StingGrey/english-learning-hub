"""APScheduler 定时任务调度"""
from apscheduler.schedulers.background import BackgroundScheduler
from models.database import SessionLocal
from services.rss_service import fetch_all_sources
from config import settings

scheduler = BackgroundScheduler()


def _fetch_rss_job():
    """定时抓取 RSS 的任务"""
    db = SessionLocal()
    try:
        count = fetch_all_sources(db)
        print(f"[Scheduler] RSS 抓取完成，新增 {count} 篇文章")
    except Exception as e:
        print(f"[Scheduler] RSS 抓取失败: {e}")
    finally:
        db.close()


def start_scheduler():
    """启动调度器"""
    scheduler.add_job(
        _fetch_rss_job,
        "interval",
        hours=settings.rss_fetch_interval,
        id="rss_fetch",
        replace_existing=True,
    )
    # 启动时立即执行一次
    scheduler.add_job(
        _fetch_rss_job,
        "date",
        id="rss_fetch_initial",
        replace_existing=True,
    )
    scheduler.start()
    print(f"[Scheduler] 已启动，RSS 每 {settings.rss_fetch_interval} 小时抓取一次")


def shutdown_scheduler():
    """关闭调度器"""
    scheduler.shutdown(wait=False)
    print("[Scheduler] 已关闭")
