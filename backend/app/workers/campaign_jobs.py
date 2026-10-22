"""RQ job: run a campaign attack engine outside the API request."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def execute_campaign_job(campaign_id: int, organization_id: int) -> str:
    """Entry point for the RQ worker. Opens its own DB session."""
    from app.core.database import SessionLocal
    from app.services import campaign_service

    db = SessionLocal()
    try:
        campaign_service.execute_campaign_run(
            db,
            campaign_id=campaign_id,
            organization_id=organization_id,
        )
        return f"campaign {campaign_id} finished"
    except Exception:
        logger.exception("Campaign job failed campaign_id=%s", campaign_id)
        try:
            campaign_service.mark_campaign_failed(
                db,
                campaign_id=campaign_id,
                organization_id=organization_id,
                reason="Worker exception during campaign execution",
            )
        except Exception:
            logger.exception("Could not mark campaign failed")
        raise
    finally:
        db.close()
