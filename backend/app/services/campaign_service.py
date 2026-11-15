import json
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.campaign import Campaign, CampaignStatus
from app.models.organization import OrganizationMember
from app.models.target import Target
from app.models.finding import AttackCategory, Finding, FindingComment, Severity, FindingStatus
from app.schemas.campaign import CampaignCreate, CampaignDetailOut, CampaignDocumentBrief, CampaignOut, CampaignRef, CampaignRerun
from app.models.user import User
from app.models.attack_document import AttackDocument
from app.services import audit_service

def _status_by_code(db: Session, code: str) -> CampaignStatus:
    row = db.query(CampaignStatus).filter(CampaignStatus.status_code == code).first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Campaign status '{code}' not seeded. Run seed_catalogs.",
        )
    return row


def _to_out(campaign: Campaign) -> CampaignOut:
    mode_code = "basic"
    if campaign.target_id and hasattr(campaign, "target") and campaign.target and campaign.target.connection_mode:
        mode_code = campaign.target.connection_mode.mode_code
    # fallback: load mode from connection_mode_id via target join already done
    status_code = campaign.status.status_code if campaign.status else "queued"
    # Prefer mode from linked target when available
    if hasattr(campaign, "_mode_code"):
        mode_code = campaign._mode_code  # type: ignore[attr-defined]

    return CampaignOut(
        campaign_id=campaign.campaign_id,
        organization_id=campaign.organization_id,
        target_id=campaign.target_id,
        name=campaign.name,
        mode=mode_code,
        status=status_code,
        scope_prompt_injection=campaign.scope_prompt_injection,
        scope_data_leakage=campaign.scope_data_leakage,
        progress_percent=campaign.progress_percent,
        scheduled_at=campaign.scheduled_at,
        started_at=campaign.started_at,
        finished_at=campaign.finished_at,
        parent_campaign_id=campaign.parent_campaign_id,
        created_by=campaign.created_by,
        created_at=campaign.created_at,
    )


def _load_campaign(db: Session, campaign_id: int, organization_id: int) -> Campaign:
    campaign = (
        db.query(Campaign)
        .options(
            joinedload(Campaign.status),
            joinedload(Campaign.target).joinedload(Target.connection_mode),
        )
        .filter(
            Campaign.campaign_id == campaign_id,
            Campaign.organization_id == organization_id,
        )
        .first()
    )
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return campaign


def create_campaign(
    db: Session,
    *,
    membership: OrganizationMember,
    user_id: int,
    data: CampaignCreate,
) -> CampaignOut:
    target = (
        db.query(Target)
        .options(joinedload(Target.connection_mode))
        .filter(
            Target.target_id == data.target_id,
            Target.organization_id == membership.organization_id,
            Target.is_active.is_(True),
        )
        .first()
    )
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target not found")

    # Complete mode needed for indirect PI / data leakage via documents
    mode_code = target.connection_mode.mode_code if target.connection_mode else "basic"
    if (data.scope_data_leakage or data.scope_prompt_injection) and mode_code == "basic":
        # Direct PI can run on basic; data leakage ideally needs complete — warn via 400 if only DL
        if data.scope_data_leakage and not data.scope_prompt_injection:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data leakage scope requires target mode 'complete' (upload endpoint)",
            )

    queued = _status_by_code(db, "queued")
    config_json = json.dumps(
        {
            **(data.config or {}),
            "document_ids": data.document_ids,
        }
    )

    campaign = Campaign(
        organization_id=membership.organization_id,
        target_id=target.target_id,
        name=data.name,
        connection_mode_id=target.connection_mode_id,
        campaign_status_id=queued.campaign_status_id,
        scope_prompt_injection=data.scope_prompt_injection,
        scope_data_leakage=data.scope_data_leakage,
        config_json=config_json,
        scheduled_at=data.scheduled_at,
        progress_percent=0,
        created_by=user_id,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    campaign = _load_campaign(db, campaign.campaign_id, membership.organization_id)
    out = _to_out(campaign)
    # attach mode from target
    return CampaignOut(
        **{
            **out.model_dump(),
            "mode": mode_code,
            "status": campaign.status.status_code,
        }
    )


def list_campaigns(
    db: Session,
    *,
    membership: OrganizationMember,
    page: int = 1,
    per_page: int = 20,
) -> tuple[list[CampaignOut], int]:
    q = (
        db.query(Campaign)
        .options(
            joinedload(Campaign.status),
            joinedload(Campaign.target).joinedload(Target.connection_mode),
        )
        .filter(Campaign.organization_id == membership.organization_id)
    )
    total = q.count()
    rows = (
        q.order_by(Campaign.campaign_id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    items = []
    for c in rows:
        mode = c.target.connection_mode.mode_code if c.target and c.target.connection_mode else "basic"
        base = _to_out(c)
        items.append(
            CampaignOut(
                **{
                    **base.model_dump(),
                    "mode": mode,
                    "status": c.status.status_code if c.status else "queued",
                }
            )
        )
    return items, total


def get_campaign(
    db: Session,
    *,
    membership: OrganizationMember,
    campaign_id: int,
) -> CampaignOut:
    c = _load_campaign(db, campaign_id, membership.organization_id)
    mode = c.target.connection_mode.mode_code if c.target and c.target.connection_mode else "basic"
    base = _to_out(c)
    return CampaignOut(
        **{
            **base.model_dump(),
            "mode": mode,
            "status": c.status.status_code if c.status else "queued",
        }
    )




def get_campaign_detail(
    db: Session,
    *,
    membership: OrganizationMember,
    campaign_id: int,
) -> CampaignDetailOut:
    campaign = _load_campaign(db, campaign_id, membership.organization_id)
    base = _to_out(campaign)

    target_name = None
    if campaign.target is not None:
        target_name = campaign.target.name

    creator = db.query(User).filter(User.user_id == campaign.created_by).first()
    created_by_email = creator.email if creator else None
    created_by_name = getattr(creator, "full_name", None) if creator else None

    cfg: dict = {}
    if campaign.config_json:
        import json
        try:
            raw = campaign.config_json
            cfg = json.loads(raw) if isinstance(raw, str) else (raw or {})
        except Exception:
            cfg = {}
    doc_ids = list(cfg.get("document_ids") or [])

    documents: list[CampaignDocumentBrief] = []
    if doc_ids:
        rows = (
            db.query(AttackDocument)
            .filter(AttackDocument.attack_document_id.in_(doc_ids))
            .all()
        )
        by_id = {d.attack_document_id: d for d in rows}
        for did in doc_ids:
            d = by_id.get(did)
            if not d:
                documents.append(
                    CampaignDocumentBrief(
                        attack_document_id=did,
                        name=f"(doc #{did} no disponible)",
                    )
                )
                continue
            technique = None
            category = None
            if getattr(d, "attack_category", None) is not None:
                category = getattr(d.attack_category, "category_code", None) or getattr(
                    d.attack_category, "category_name", None
                )
            technique = getattr(d, "technique", None) or getattr(d, "technique_code", None)
            documents.append(
                CampaignDocumentBrief(
                    attack_document_id=d.attack_document_id,
                    name=d.name,
                    technique=technique,
                    category=category,
                    scope=getattr(d, "scope", None),
                )
            )

    findings_count = (
        db.query(Finding)
        .filter(Finding.campaign_id == campaign.campaign_id)
        .count()
    )

    parent_ref = None
    if campaign.parent_campaign_id:
        parent = (
            db.query(Campaign)
            .options(joinedload(Campaign.status))
            .filter(
                Campaign.campaign_id == campaign.parent_campaign_id,
                Campaign.organization_id == membership.organization_id,
            )
            .first()
        )
        if parent:
            parent_ref = CampaignRef(
                campaign_id=parent.campaign_id,
                name=parent.name,
                status=parent.status.status_code if parent.status else "unknown",
                created_at=parent.created_at,
            )

    children_rows = (
        db.query(Campaign)
        .options(joinedload(Campaign.status))
        .filter(
            Campaign.parent_campaign_id == campaign.campaign_id,
            Campaign.organization_id == membership.organization_id,
        )
        .order_by(Campaign.campaign_id.asc())
        .all()
    )
    children = [
        CampaignRef(
            campaign_id=ch.campaign_id,
            name=ch.name,
            status=ch.status.status_code if ch.status else "unknown",
            created_at=ch.created_at,
        )
        for ch in children_rows
    ]

    return CampaignDetailOut(
        **base.model_dump(),
        target_name=target_name,
        created_by_email=created_by_email,
        created_by_name=created_by_name,
        document_ids=doc_ids,
        documents=documents,
        findings_count=findings_count,
        parent=parent_ref,
        children=children,
        config=cfg or None,
    )


def cancel_campaign(
    db: Session,
    *,
    membership: OrganizationMember,
    campaign_id: int,
) -> CampaignOut:
    c = _load_campaign(db, campaign_id, membership.organization_id)
    code = c.status.status_code if c.status else ""
    if code in ("completed", "failed", "cancelled"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel campaign in status '{code}'",
        )
    cancelled = _status_by_code(db, "cancelled")
    c.campaign_status_id = cancelled.campaign_status_id
    c.finished_at = datetime.now(timezone.utc)
    db.commit()
    return get_campaign(db, membership=membership, campaign_id=campaign_id)

def _status_row(db: Session, code: str) -> CampaignStatus:
    return _status_by_code(db, code)



def mark_campaign_failed(
    db: Session,
    *,
    campaign_id: int,
    organization_id: int,
    reason: str = "Execution failed",
) -> None:
    """Best-effort: set campaign to failed (used by worker on crash)."""
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
        return
    code = c.status.status_code if c.status else ""
    if code in ("completed", "cancelled", "failed"):
        return
    failed = _status_row(db, "failed")
    c.campaign_status_id = failed.campaign_status_id
    c.progress_percent = 100
    c.finished_at = datetime.now(timezone.utc)
    db.commit()


def execute_campaign_run(
    db: Session,
    *,
    campaign_id: int,
    organization_id: int,
) -> None:
    """Core attack loop (sync). Called by API fallback or RQ worker."""
    from app.models.attack_document import AttackDocument
    from app.services.attack_engine import load_doc_payload, run_all_probes

    # Wake Render lab early (non-blocking) so cold start overlaps with setup
    try:
        from app.core.lab_wake import target_looks_like_lab, wake_lab_services

        # Always attempt if LAB_WAKE_URL set; force on campaign start
        # force=True ignores throttle; wait uses LAB_WAKE_WAIT_SECONDS if set
        wake_lab_services(force=True, wait=True)
    except Exception:
        pass

    c = _load_campaign(db, campaign_id, organization_id)
    current = c.status.status_code if c.status else ""
    # Worker may pick up queued; API may have left it queued
    if current not in ("queued", "failed", "running"):
        return

    target = c.target
    if not target or not target.is_active:
        mark_campaign_failed(
            db,
            campaign_id=campaign_id,
            organization_id=organization_id,
            reason="Target missing or inactive",
        )
        return

    mode_code = "basic"
    if target.connection_mode:
        mode_code = target.connection_mode.mode_code

    running = _status_row(db, "running")
    completed = _status_row(db, "completed")
    failed = _status_row(db, "failed")
    open_st = db.query(FindingStatus).filter(FindingStatus.status_code == "open").first()
    severities = {
        s.severity_code: s
        for s in db.query(Severity).filter(Severity.is_active.is_(True)).all()
    }
    categories = {
        cat.category_code: cat
        for cat in db.query(AttackCategory).filter(AttackCategory.is_active.is_(True)).all()
    }

    if not open_st or "high" not in severities or "prompt_injection_direct" not in categories:
        mark_campaign_failed(
            db,
            campaign_id=campaign_id,
            organization_id=organization_id,
            reason="Finding catalogs not seeded",
        )
        return

    doc_ids: list[int] = []
    if c.config_json:
        try:
            cfg = json.loads(c.config_json)
            raw_ids = cfg.get("document_ids") or []
            doc_ids = [int(x) for x in raw_ids]
        except (json.JSONDecodeError, TypeError, ValueError):
            doc_ids = []

    # Only documents explicitly selected (or org/global active set if none listed).
    # Content always comes from disk — never from hardcoded Python strings.
    payloads = []
    q = (
        db.query(AttackDocument)
        .options(joinedload(AttackDocument.category))
        .filter(AttackDocument.is_active.is_(True))
    )
    if doc_ids:
        q = q.filter(AttackDocument.attack_document_id.in_(doc_ids))
    else:
        q = q.filter(
            (AttackDocument.scope == "global")
            | (AttackDocument.organization_id == organization_id)
        )
    for d in q.all():
        # Attack family MUST be the catalog category (prompt_injection_*), not the
        # fine-grained technique label (override_instructions, persona_dan, ...).
        # Otherwise findings are dropped (unknown category) and complete-mode
        # skips the direct-body path.
        family = (
            d.category.category_code
            if d.category
            else (d.technique if d.technique in (
                "prompt_injection_direct",
                "prompt_injection_indirect",
                "data_leakage",
            ) else "prompt_injection_indirect")
        )
        loaded = load_doc_payload(
            attack_document_id=d.attack_document_id,
            name=d.name,
            file_name=d.file_name,
            storage_path=d.storage_path,
            technique=family,
        )
        if loaded is not None:
            payloads.append(loaded)

    now = datetime.now(timezone.utc)
    c.campaign_status_id = running.campaign_status_id
    if not c.started_at:
        c.started_at = now
    c.progress_percent = 10
    db.commit()

    if not payloads:
        mark_campaign_failed(
            db,
            campaign_id=campaign_id,
            organization_id=organization_id,
            reason="No attack documents selected or files missing on disk. Upload/select payloads first.",
        )
        return

    results = run_all_probes(
        target,
        scope_prompt_injection=c.scope_prompt_injection,
        scope_data_leakage=c.scope_data_leakage,
        documents=payloads,
    )

    c = _load_campaign(db, campaign_id, organization_id)
    total = max(len(results), 1)
    http_ok = 0

    for i, result in enumerate(results):
        c.progress_percent = min(90, 10 + int(80 * (i + 1) / total))
        db.flush()

        if result.ok_http:
            http_ok += 1
        if not result.vulnerable:
            continue

        tech = (result.probe.technique or "").lower()
        cat = categories.get(result.probe.technique)
        if not cat:
            if "leak" in tech or tech == "data_leakage":
                cat = categories.get("data_leakage")
            elif "indirect" in tech:
                cat = categories.get("prompt_injection_indirect")
            else:
                cat = categories.get("prompt_injection_direct")
        sev = severities.get(result.probe.severity) or severities.get("high")
        if not cat or not sev:
            continue

        confirmed = getattr(result, "evidence_level", "") == "confirmed" or result.vulnerable
        db.add(
            Finding(
                campaign_id=c.campaign_id,
                attack_category_id=cat.attack_category_id,
                severity_id=sev.severity_id,
                finding_status_id=open_st.finding_status_id,
                title=result.probe.title,
                description=(
                    f"CONFIRMED finding against {target.chat_endpoint}. "
                    f"HTTP {result.status_code}. {result.evidence}"
                )[:4000],
                recommendation=result.probe.recommendation,
                priority_order=result.probe.priority,
                query_used=result.probe.query[:4000],
                response_excerpt=(result.response_text or "")[:2000],
                canary_found=confirmed,
            )
        )

    if not results:
        # No HTTP probes ran (e.g. empty payload set after filters). Fail only then.
        c.campaign_status_id = failed.campaign_status_id
        c.progress_percent = 100
        c.finished_at = datetime.now(timezone.utc)
        db.commit()
        return

    if http_ok == 0:
        c.campaign_status_id = failed.campaign_status_id
        c.progress_percent = 100
        c.finished_at = datetime.now(timezone.utc)
        errors = [r.error for r in results if r.error][:5]
        statuses = [str(r.status_code) for r in results if r.status_code is not None][:8]
        err = "; ".join(errors) if errors else "All probes failed (no HTTP 2xx)"
        detail = (
            f"All HTTP probes failed against {target.chat_endpoint}. "
            f"status_codes={statuses or 'n/a'}. Last errors: {err}"
        )
        # Visible in Render logs
        import logging
        logging.getLogger(__name__).error("Campaign %s failed: %s", campaign_id, detail)
        cat = categories.get("prompt_injection_direct") or next(iter(categories.values()), None)
        sev = severities.get("medium") or severities.get("high")
        if cat and sev and open_st:
            db.add(
                Finding(
                    campaign_id=c.campaign_id,
                    attack_category_id=cat.attack_category_id,
                    severity_id=sev.severity_id,
                    finding_status_id=open_st.finding_status_id,
                    title="Campaign probes could not reach chat endpoint",
                    description=detail[:4000],
                    recommendation=(
                        "Verify chat_endpoint URL, Authorization / headers_extra on the Target, "
                        "and that Render can reach the host (Groq needs Bearer + model-compatible body)."
                    ),
                    priority_order=5,
                    query_used=None,
                    response_excerpt=err[:2000],
                    canary_found=False,
                )
            )
        db.commit()
        return

    c.campaign_status_id = completed.campaign_status_id
    c.progress_percent = 100
    c.finished_at = datetime.now(timezone.utc)
    db.commit()


def run_campaign(
    db: Session,
    *,
    membership: OrganizationMember,
    campaign_id: int,
) -> CampaignOut:
    """Enqueue campaign on Redis/RQ, or run in-process if async is disabled / Redis down."""
    from app.core.config import settings

    c = _load_campaign(db, campaign_id, membership.organization_id)
    current = c.status.status_code if c.status else ""
    if current not in ("queued", "failed"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot run campaign in status '{current}' (need queued or failed)",
        )

    target = c.target
    if not target or not target.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Campaign target is missing or inactive",
        )

    # Reset progress for re-runs from failed
    queued = _status_row(db, "queued")
    c.campaign_status_id = queued.campaign_status_id
    c.progress_percent = 0
    c.started_at = None
    c.finished_at = None
    audit_service.log_event(
        db,
        action="campaign.run",
        actor_user_id=membership.user_id,
        organization_id=membership.organization_id,
        resource_type="campaign",
        resource_id=campaign_id,
        summary=f"Campaign {campaign_id} queued for execution",
        metadata={"campaign_id": campaign_id},
    )
    db.commit()

    use_async = getattr(settings, "campaign_async", True)
    if use_async:
        try:
            from app.core.queue import enqueue_campaign_job

            enqueue_campaign_job(campaign_id, membership.organization_id)
            return get_campaign(db, membership=membership, campaign_id=campaign_id)
        except Exception:
            # Fallback: run sync so local demo still works without a worker
            import logging

            logging.getLogger(__name__).exception(
                "Redis/RQ enqueue failed; falling back to synchronous run"
            )

    execute_campaign_run(
        db,
        campaign_id=campaign_id,
        organization_id=membership.organization_id,
    )
    return get_campaign(db, membership=membership, campaign_id=campaign_id)


def run_campaign_stub(
    db: Session,
    *,
    membership: OrganizationMember,
    campaign_id: int,
) -> CampaignOut:
    return run_campaign(db, membership=membership, campaign_id=campaign_id)



def rerun_campaign(
    db: Session,
    *,
    membership: OrganizationMember,
    user_id: int,
    campaign_id: int,
    data: CampaignRerun,
) -> CampaignOut:
    parent = _load_campaign(db, campaign_id, membership.organization_id)
    parent_status = parent.status.status_code if parent.status else ""
    if parent_status not in ("completed", "failed", "cancelled"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Can only re-run finished campaigns (got '{parent_status}')",
        )

    queued = _status_by_code(db, "queued")

    if data.change_config:
        scope_pi = (
            data.scope_prompt_injection
            if data.scope_prompt_injection is not None
            else parent.scope_prompt_injection
        )
        scope_dl = (
            data.scope_data_leakage
            if data.scope_data_leakage is not None
            else parent.scope_data_leakage
        )
        if not scope_pi and not scope_dl:
            raise HTTPException(
                status_code=400,
                detail="At least one scope must be true",
            )
        if data.config is not None or data.document_ids is not None:
            base_cfg: dict = {}
            if parent.config_json:
                try:
                    base_cfg = json.loads(parent.config_json)
                except json.JSONDecodeError:
                    base_cfg = {}
            if data.config:
                base_cfg.update(data.config)
            if data.document_ids is not None:
                base_cfg["document_ids"] = data.document_ids
            config_json = json.dumps(base_cfg)
        else:
            config_json = parent.config_json
    else:
        scope_pi = parent.scope_prompt_injection
        scope_dl = parent.scope_data_leakage
        config_json = parent.config_json

    name = data.name or f"Re-run: {parent.name}"

    child = Campaign(
        organization_id=membership.organization_id,
        target_id=parent.target_id,
        name=name,
        connection_mode_id=parent.connection_mode_id,
        campaign_status_id=queued.campaign_status_id,
        scope_prompt_injection=scope_pi,
        scope_data_leakage=scope_dl,
        config_json=config_json,
        scheduled_at=None,
        parent_campaign_id=parent.campaign_id,
        progress_percent=0,
        created_by=user_id,
    )
    db.add(child)
    db.commit()
    db.refresh(child)

    return get_campaign(db, membership=membership, campaign_id=child.campaign_id)

def _finding_fingerprint(f: Finding) -> str:
    """Stable key to match findings across re-runs (ignore probe index suffix)."""
    import re

    title = f.title or ""
    title = re.sub(r"\s*[·•\-]\s*probe\s*\d+\s*$", "", title, flags=re.I).strip().lower()
    cat = f.category.category_code if f.category else ""
    sev = f.severity.severity_code if f.severity else ""
    return f"{cat}|{sev}|{title}"


def _finding_brief(f: Finding) -> dict:
    return {
        "finding_id": f.finding_id,
        "title": f.title,
        "severity": f.severity.severity_code if f.severity else None,
        "category": f.category.category_code if f.category else None,
        "status": f.status.status_code if f.status else None,
        "canary_found": bool(f.canary_found),
    }


def _load_campaign_findings(db: Session, campaign_id: int) -> list[Finding]:
    return (
        db.query(Finding)
        .options(
            joinedload(Finding.severity),
            joinedload(Finding.status),
            joinedload(Finding.category),
        )
        .filter(Finding.campaign_id == campaign_id, Finding.is_active.is_(True))
        .order_by(Finding.finding_id.asc())
        .all()
    )


def compare_campaigns(
    db: Session,
    *,
    membership: OrganizationMember,
    campaign_id: int,
    against_id: int | None = None,
) -> dict:
    """Compare a campaign with its parent (re-run) or with an explicit against_id.

    Returns buckets: new, resolved, persistent (matched by category+severity+title base).
    """
    current = _load_campaign(db, campaign_id, membership.organization_id)
    other_id = against_id or current.parent_campaign_id
    if not other_id:
        raise HTTPException(
            status_code=400,
            detail="Campaign has no parent_campaign_id; pass against_id to compare with another run",
        )
    baseline = _load_campaign(db, other_id, membership.organization_id)

    cur_rows = _load_campaign_findings(db, current.campaign_id)
    base_rows = _load_campaign_findings(db, baseline.campaign_id)

    cur_map = {_finding_fingerprint(f): f for f in cur_rows}
    base_map = {_finding_fingerprint(f): f for f in base_rows}

    new_keys = set(cur_map) - set(base_map)
    resolved_keys = set(base_map) - set(cur_map)
    persistent_keys = set(cur_map) & set(base_map)

    return {
        "campaign_id": current.campaign_id,
        "campaign_name": current.name,
        "campaign_status": current.status.status_code if current.status else None,
        "baseline_campaign_id": baseline.campaign_id,
        "baseline_campaign_name": baseline.name,
        "baseline_status": baseline.status.status_code if baseline.status else None,
        "summary": {
            "current_findings": len(cur_rows),
            "baseline_findings": len(base_rows),
            "new": len(new_keys),
            "resolved": len(resolved_keys),
            "persistent": len(persistent_keys),
            "improved": len(resolved_keys) > 0 and len(new_keys) == 0,
        },
        "new": [_finding_brief(cur_map[k]) for k in sorted(new_keys)],
        "resolved": [_finding_brief(base_map[k]) for k in sorted(resolved_keys)],
        "persistent": [
            {
                "fingerprint": k,
                "current": _finding_brief(cur_map[k]),
                "baseline": _finding_brief(base_map[k]),
            }
            for k in sorted(persistent_keys)
        ],
    }
