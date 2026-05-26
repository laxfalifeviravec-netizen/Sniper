"""
Celery application configuration.

Start worker:
    celery -A app.workers.celery_app worker --loglevel=info

Start beat scheduler:
    celery -A app.workers.celery_app beat --loglevel=info

Combined (dev only):
    celery -A app.workers.celery_app worker --beat --loglevel=info
"""
from celery import Celery
from celery.schedules import crontab

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "sniper",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    # Timezone
    timezone="UTC",
    enable_utc=True,
    # Task execution
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # Results
    result_expires=3600,  # 1 hour
    # Retry defaults
    task_max_retries=3,
    task_default_retry_delay=60,  # 1 minute
    # Beat schedule
    beat_schedule={
        "scrape-all-sources": {
            "task": "app.workers.tasks.scrape_all_sources",
            "schedule": crontab(minute="*/30"),  # every 30 minutes
            "options": {"queue": "scraping"},
        },
    },
    # Queue routing
    task_routes={
        "app.workers.tasks.scrape_all_sources": {"queue": "scraping"},
        "app.workers.tasks.scrape_source": {"queue": "scraping"},
        "app.workers.tasks.check_alerts": {"queue": "alerts"},
        "app.workers.tasks.send_alert_email": {"queue": "notifications"},
        "app.workers.tasks.send_alert_sms": {"queue": "notifications"},
    },
    # Worker settings
    worker_max_tasks_per_child=100,
    worker_max_memory_per_child=512_000,  # 512 MB
)
