"""RQ queue helpers."""

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
        job_timeout=900,
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
