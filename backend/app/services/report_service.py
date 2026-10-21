from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.campaign import Campaign
from app.models.organization import OrganizationMember
from app.models.report import Report
from app.schemas.report import ReportCreate, ReportOut


def _get_org_campaign(
    db: Session, organization_id: int, campaign_id: int
) -> Campaign:
    c = (
        db.query(Campaign)
        .filter(
            Campaign.campaign_id == campaign_id,
            Campaign.organization_id == organization_id,
        )
        .first()
    )
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return c


def create_report(
    db: Session,
    *,
    membership: OrganizationMember,
    user_id: int,
    campaign_id: int,
    data: ReportCreate,
) -> ReportOut:
    c = _get_org_campaign(db, membership.organization_id, campaign_id)

    # Stub: prefer completed; allow others for demos
    status_code = c.status.status_code if c.status else ""
    if status_code not in ("completed", "failed", "running", "queued"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot generate report for campaign status '{status_code}'",
        )

    now = datetime.now(timezone.utc)
    # Stub path — real PDF generation later
    file_path = (
        f"/storage/reports/org_{membership.organization_id}/"
        f"campaign_{campaign_id}_{data.report_type}_{data.language}.pdf"
    )

    report = Report(
        campaign_id=campaign_id,
        report_type=data.report_type,
        language=data.language,
        report_status="ready",  # stub: instant
        file_path=file_path,
        size_bytes=204800,
        generated_by=user_id,
        generated_at=now,
        expires_at=now + timedelta(days=30),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return ReportOut.model_validate(report)


def list_reports(
    db: Session,
    *,
    membership: OrganizationMember,
    campaign_id: int | None = None,
) -> list[ReportOut]:
    q = (
        db.query(Report)
        .join(Campaign, Report.campaign_id == Campaign.campaign_id)
        .filter(Campaign.organization_id == membership.organization_id)
    )
    if campaign_id is not None:
        q = q.filter(Report.campaign_id == campaign_id)
    rows = q.order_by(Report.report_id.desc()).all()
    return [ReportOut.model_validate(r) for r in rows]


def get_report(
    db: Session,
    *,
    membership: OrganizationMember,
    report_id: int,
) -> ReportOut:
    report = (
        db.query(Report)
        .join(Campaign, Report.campaign_id == Campaign.campaign_id)
        .filter(
            Report.report_id == report_id,
            Campaign.organization_id == membership.organization_id,
        )
        .first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return ReportOut.model_validate(report)