from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.models.attack_document import AttackDocument
from app.models.finding import AttackCategory
from app.models.organization import OrganizationMember
from app.models.user import User
from app.schemas.attack_document import AttackDocumentCreate, AttackDocumentOut


def _to_out(doc: AttackDocument) -> AttackDocumentOut:
    return AttackDocumentOut(
        attack_document_id=doc.attack_document_id,
        organization_id=doc.organization_id,
        name=doc.name,
        description=doc.description,
        technique=doc.technique,
        category=doc.category.category_code if doc.category else "unknown",
        scope=doc.scope,
        file_name=doc.file_name,
        storage_path=doc.storage_path,
        size_bytes=doc.size_bytes,
        doc_version=doc.doc_version,
        is_active=doc.is_active,
        created_at=doc.created_at,
    )


def list_documents(
    db: Session,
    *,
    membership: OrganizationMember,
    scope: str | None = None,  # global | organization | None = both visible
    page: int = 1,
    per_page: int = 20,
) -> tuple[list[AttackDocumentOut], int]:
    """Globals + docs de la organización del usuario."""
    q = (
        db.query(AttackDocument)
        .options(joinedload(AttackDocument.category))
        .filter(
            AttackDocument.is_active.is_(True),
            or_(
                AttackDocument.scope == "global",
                AttackDocument.organization_id == membership.organization_id,
            ),
        )
    )
    if scope == "global":
        q = q.filter(AttackDocument.scope == "global")
    elif scope == "organization":
        q = q.filter(
            AttackDocument.scope == "organization",
            AttackDocument.organization_id == membership.organization_id,
        )

    total = q.count()
    rows = (
        q.order_by(AttackDocument.attack_document_id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return [_to_out(d) for d in rows], total


def create_document(
    db: Session,
    *,
    membership: OrganizationMember,
    user: User,
    data: AttackDocumentCreate,
) -> AttackDocumentOut:
    cat = (
        db.query(AttackCategory)
        .filter(AttackCategory.category_code == data.category_code)
        .first()
    )
    if not cat:
        raise HTTPException(status_code=400, detail=f"Unknown category '{data.category_code}'")

    if data.scope == "global" and not user.is_platform_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform admin can create global attack documents",
        )

    org_id = None if data.scope == "global" else membership.organization_id

    doc = AttackDocument(
        organization_id=org_id,
        attack_category_id=cat.attack_category_id,
        name=data.name,
        description=data.description,
        technique=data.technique,
        scope=data.scope,
        file_name=data.file_name,
        storage_path=data.storage_path,
        size_bytes=data.size_bytes,
        doc_version=data.doc_version or "1.0",
        is_active=True,
        created_by=user.user_id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    doc = (
        db.query(AttackDocument)
        .options(joinedload(AttackDocument.category))
        .filter(AttackDocument.attack_document_id == doc.attack_document_id)
        .one()
    )
    return _to_out(doc)


def get_document(
    db: Session,
    *,
    membership: OrganizationMember,
    document_id: int,
) -> AttackDocumentOut:
    doc = (
        db.query(AttackDocument)
        .options(joinedload(AttackDocument.category))
        .filter(AttackDocument.attack_document_id == document_id)
        .first()
    )
    if not doc or not doc.is_active:
        raise HTTPException(status_code=404, detail="Attack document not found")
    if doc.scope == "organization" and doc.organization_id != membership.organization_id:
        raise HTTPException(status_code=404, detail="Attack document not found")
    return _to_out(doc)


def deactivate_document(
    db: Session,
    *,
    membership: OrganizationMember,
    user: User,
    document_id: int,
) -> None:
    doc = (
        db.query(AttackDocument)
        .filter(AttackDocument.attack_document_id == document_id)
        .first()
    )
    if not doc or not doc.is_active:
        raise HTTPException(status_code=404, detail="Attack document not found")

    if doc.scope == "global" and not user.is_platform_admin:
        raise HTTPException(status_code=403, detail="Only platform admin can remove global docs")
    if doc.scope == "organization" and doc.organization_id != membership.organization_id:
        raise HTTPException(status_code=404, detail="Attack document not found")

    doc.is_active = False
    db.commit()