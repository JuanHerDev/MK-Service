from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.campaign import Campaign
from app.models.finding import Finding, FindingComment, FindingStatus
from app.models.organization import OrganizationMember
from app.schemas.finding import FindingCommentOut, FindingOut, FindingUpdate


def _to_out(f: Finding) -> FindingOut:
    return FindingOut(
        finding_id=f.finding_id,
        campaign_id=f.campaign_id,
        title=f.title,
        description=f.description,
        recommendation=f.recommendation,
        severity=f.severity.severity_code if f.severity else "medium",
        status=f.status.status_code if f.status else "open",
        category=f.category.category_code if f.category else "unknown",
        priority_order=f.priority_order,
        canary_found=f.canary_found,
        query_used=f.query_used,
        response_excerpt=f.response_excerpt,
        is_active=f.is_active,
        created_at=f.created_at,
        updated_at=f.updated_at,
    )


def _org_campaign_ids(db: Session, organization_id: int) -> list[int]:
    return [
        r[0]
        for r in db.query(Campaign.campaign_id)
        .filter(Campaign.organization_id == organization_id)
        .all()
    ]


def list_findings(
    db: Session,
    *,
    membership: OrganizationMember,
    campaign_id: int | None = None,
    page: int = 1,
    per_page: int = 20,
) -> tuple[list[FindingOut], int]:
    org_ids = _org_campaign_ids(db, membership.organization_id)
    q = (
        db.query(Finding)
        .options(
            joinedload(Finding.severity),
            joinedload(Finding.status),
            joinedload(Finding.category),
        )
        .filter(Finding.campaign_id.in_(org_ids), Finding.is_active.is_(True))
    )
    if campaign_id is not None:
        if campaign_id not in org_ids:
            raise HTTPException(status_code=404, detail="Campaign not found")
        q = q.filter(Finding.campaign_id == campaign_id)

    total = q.count()
    rows = (
        q.order_by(Finding.priority_order.asc(), Finding.finding_id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return [_to_out(f) for f in rows], total


def get_finding(
    db: Session,
    *,
    membership: OrganizationMember,
    finding_id: int,
) -> FindingOut:
    org_ids = _org_campaign_ids(db, membership.organization_id)
    f = (
        db.query(Finding)
        .options(
            joinedload(Finding.severity),
            joinedload(Finding.status),
            joinedload(Finding.category),
        )
        .filter(Finding.finding_id == finding_id, Finding.campaign_id.in_(org_ids))
        .first()
    )
    if not f:
        raise HTTPException(status_code=404, detail="Finding not found")
    return _to_out(f)


def update_finding(
    db: Session,
    *,
    membership: OrganizationMember,
    finding_id: int,
    data: FindingUpdate,
) -> FindingOut:
    org_ids = _org_campaign_ids(db, membership.organization_id)
    f = (
        db.query(Finding)
        .options(
            joinedload(Finding.severity),
            joinedload(Finding.status),
            joinedload(Finding.category),
        )
        .filter(Finding.finding_id == finding_id, Finding.campaign_id.in_(org_ids))
        .first()
    )
    if not f:
        raise HTTPException(status_code=404, detail="Finding not found")

    if data.status is not None:
        st = (
            db.query(FindingStatus)
            .filter(FindingStatus.status_code == data.status)
            .first()
        )
        if not st:
            raise HTTPException(status_code=400, detail=f"Invalid status '{data.status}'")
        f.finding_status_id = st.finding_status_id
    if data.recommendation is not None:
        f.recommendation = data.recommendation
    if data.priority_order is not None:
        f.priority_order = data.priority_order
    if data.assigned_to is not None:
        f.assigned_to = data.assigned_to

    f.updated_at = datetime.now(timezone.utc)
    db.commit()
    return get_finding(db, membership=membership, finding_id=finding_id)


def add_comment(
    db: Session,
    *,
    membership: OrganizationMember,
    user_id: int,
    finding_id: int,
    message: str,
) -> FindingCommentOut:
    org_ids = _org_campaign_ids(db, membership.organization_id)
    f = (
        db.query(Finding)
        .filter(Finding.finding_id == finding_id, Finding.campaign_id.in_(org_ids))
        .first()
    )
    if not f:
        raise HTTPException(status_code=404, detail="Finding not found")

    c = FindingComment(finding_id=finding_id, user_id=user_id, message=message)
    db.add(c)
    db.commit()
    db.refresh(c)
    return FindingCommentOut(
        comment_id=c.comment_id,
        finding_id=c.finding_id,
        user_id=c.user_id,
        message=c.message,
        created_at=c.created_at,
    )


def list_comments(
    db: Session,
    *,
    membership: OrganizationMember,
    finding_id: int,
) -> list[FindingCommentOut]:
    org_ids = _org_campaign_ids(db, membership.organization_id)
    f = (
        db.query(Finding)
        .filter(Finding.finding_id == finding_id, Finding.campaign_id.in_(org_ids))
        .first()
    )
    if not f:
        raise HTTPException(status_code=404, detail="Finding not found")

    rows = (
        db.query(FindingComment)
        .filter(FindingComment.finding_id == finding_id)
        .order_by(FindingComment.comment_id.asc())
        .all()
    )
    return [
        FindingCommentOut(
            comment_id=c.comment_id,
            finding_id=c.finding_id,
            user_id=c.user_id,
            message=c.message,
            created_at=c.created_at,
        )
        for c in rows
    ]