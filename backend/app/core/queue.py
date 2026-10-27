from __future__ import annotations

import logging

from redis import Redis
from rq import Queue

from app.core.config import settings

logger = logging.getLogger(__name__)

QUEUE_NAME = "mk_campaigns"


def get_redis() -> Redis:
    return Redis.from_url(settings.redis_url)


def get_campaign_queue() -> Queue:
    return Queue(QUEUE_NAME, connection=get_redis())


def enqueue_campaign_job(campaign_id: int, organization_id: int):
    """Enqueue campaign execution. Raises if Redis is unreachable."""
    from app.workers.campaign_jobs import execute_campaign_job

    q = get_campaign_queue()
    job = q.enqueue(
        execute_campaign_job,
        campaign_id,
        organization_id,
        job_timeout=-1,  # no Unix SIGALRM limit (Windows-safe)
        result_ttl=3600,
        failure_ttl=86400,
    )
    logger.info(
        "Enqueued campaign job id=%s campaign_id=%s org=%s",
        job.id,
        campaign_id,
        organization_id,
    )
    return job


def get_queue_status() -> dict:
    """Redis/RQ health for UI (non-fatal if Redis is down)."""
    try:
        r = get_redis()
        r.ping()
        q = get_campaign_queue()
        workers = []
        try:
            from rq.worker import Worker

            workers = [w.name for w in Worker.all(connection=r) if QUEUE_NAME in (w.queue_names() or [])]
        except Exception:
            try:
                from rq.worker import Worker

                workers = [w.name for w in Worker.all(connection=r)]
            except Exception:
                workers = []
        return {
            "redis_ok": True,
            "queue_name": QUEUE_NAME,
            "queued_jobs": len(q),
            "workers": workers,
            "workers_count": len(workers),
            "status": "healthy" if workers else "no_workers",
            "message": (
                "Worker conectado"
                if workers
                else "Redis OK pero no hay worker escuchando mk_campaigns"
            ),
        }
    except Exception as exc:
        return {
            "redis_ok": False,
            "queue_name": QUEUE_NAME,
            "queued_jobs": 0,
            "workers": [],
            "workers_count": 0,
            "status": "unavailable",
            "message": f"Redis no disponible: {exc}",
        }
