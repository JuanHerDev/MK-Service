from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.models.campaign import Campaign
from app.models.finding import Finding
from app.models.organization import Organization, OrganizationMember
from app.models.report import Report
from app.schemas.report import ReportCreate, ReportOut
from app.services.pdf_report import build_report_pdf, write_report_file


def _get_org_campaign(db: Session, organization_id: int, campaign_id: int) -> Campaign:
    c = (
        db.query(Campaign)
        .options(joinedload(Campaign.status))
        .filter(
            Campaign.campaign_id == campaign_id,
            Campaign.organization_id == organization_id,
        )
        .first()
    )
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return c


def _findings_payload(db: Session, campaign_id: int) -> list[dict]:
    rows = (
        db.query(Finding)
        .options(
            joinedload(Finding.severity),
            joinedload(Finding.status),
            joinedload(Finding.category),
        )
        .filter(Finding.campaign_id == campaign_id, Finding.is_active.is_(True))
        .order_by(Finding.priority_order.asc(), Finding.finding_id.asc())
        .all()
    )
    out: list[dict] = []
    for f in rows:
        out.append(
            {
                "finding_id": f.finding_id,
                "title": f.title,
                "description": f.description,
                "recommendation": f.recommendation,
                "severity": f.severity.severity_code if f.severity else None,
                "status": f.status.status_code if f.status else None,
                "category": f.category.category_code if f.category else None,
                "query_used": f.query_used,
                "response_excerpt": f.response_excerpt,
                "canary_found": f.canary_found,
            }
        )
    return out


def create_report(
    db: Session,
    *,
    membership: OrganizationMember,
    user_id: int,
    campaign_id: int,
    data: ReportCreate,
) -> ReportOut:
    c = _get_org_campaign(db, membership.organization_id, campaign_id)

    status_code = c.status.status_code if c.status else ""
    if status_code not in ("completed", "failed", "running", "queued"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot generate report for campaign status '{status_code}'",
        )

    org = (
        db.query(Organization)
        .filter(Organization.organization_id == membership.organization_id)
        .first()
    )
    org_name = org.name if org else f"Org {membership.organization_id}"

    findings = _findings_payload(db, campaign_id)
    campaign_info = {
        "campaign_id": c.campaign_id,
        "name": c.name,
        "status": status_code,
    }

    try:
        pdf_bytes = build_report_pdf(
            report_type=data.report_type,
            language=data.language,
            campaign=campaign_info,
            findings=findings,
            organization_name=org_name,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {exc}") from exc

    storage_root = Path(settings.storage_path)
    rel = (
        Path("reports")
        / f"org_{membership.organization_id}"
        / f"campaign_{campaign_id}_{data.report_type}_{data.language}_{int(datetime.now(timezone.utc).timestamp())}.pdf"
    )
    abs_path = storage_root / rel
    size = write_report_file(abs_path, pdf_bytes)

    now = datetime.now(timezone.utc)
    report = Report(
        campaign_id=campaign_id,
        report_type=data.report_type,
        language=data.language,
        report_status="ready",
        file_path=str(rel).replace("\\", "/"),
        size_bytes=size,
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


def get_report_file_path(
    db: Session,
    *,
    membership: OrganizationMember,
    report_id: int,
) -> Path:
    report = (
        db.query(Report)
        .join(Campaign, Report.campaign_id == Campaign.campaign_id)
        .filter(
            Report.report_id == report_id,
            Campaign.organization_id == membership.organization_id,
        )
        .first()
    )
    if not report or not report.file_path:
        raise HTTPException(status_code=404, detail="Report file not found")
    path = Path(settings.storage_path) / report.file_path
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Report file missing on disk")
    return path