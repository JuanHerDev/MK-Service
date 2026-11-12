from fastapi import APIRouter, Depends, File, Form, Query, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_read_role, require_write_role
from app.models.organization import OrganizationMember
from app.models.user import User
from app.schemas.attack_document import (
    AttackDocumentCreate,
    AttackDocumentListResponse,
    AttackDocumentOut,
)
from app.services import attack_document_service

router = APIRouter(prefix="/attack-documents", tags=["Attack documents"])

MAX_UPLOAD_BYTES = 2 * 1024 * 1024  # 2 MiB
ALLOWED_UPLOAD_EXTENSIONS = {".txt", ".md", ".json", ".csv", ".log", ".xml", ".html", ".htm"}
ALLOWED_UPLOAD_CONTENT_TYPES = {
    "text/plain",
    "text/markdown",
    "text/csv",
    "text/html",
    "application/json",
    "application/xml",
    "text/xml",
    "application/octet-stream",  # browsers sometimes send this
}


@router.get("", response_model=AttackDocumentListResponse)
def list_attack_documents(
    scope: str | None = Query(None, pattern="^(global|organization)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    membership: OrganizationMember = Depends(require_read_role),
    db: Session = Depends(get_db),
):
    items, total = attack_document_service.list_documents(
        db, membership=membership, scope=scope, page=page, per_page=per_page
    )
    return AttackDocumentListResponse(items=items, total=total, page=page, per_page=per_page)


@router.post("", response_model=AttackDocumentOut, status_code=201)
def create_attack_document(
    body: AttackDocumentCreate,
    membership: OrganizationMember = Depends(require_write_role),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """JSON create. Optional content_text is written under storage/payloads/."""
    return attack_document_service.create_document(
        db, membership=membership, user=current_user, data=body
    )


@router.post("/upload", response_model=AttackDocumentOut, status_code=201)
async def upload_attack_document(
    file: UploadFile = File(...),
    name: str = Form(...),
    category_code: str = Form(...),
    scope: str = Form("organization"),
    description: str | None = Form(None),
    technique: str | None = Form(None),
    doc_version: str | None = Form("1.0"),
    membership: OrganizationMember = Depends(require_write_role),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Multipart upload: file is stored on disk; DB keeps relative storage_path."""
    from pathlib import Path as _Path
    from fastapi import HTTPException

    from app.core.config import settings

    max_bytes = getattr(settings, "max_upload_bytes", MAX_UPLOAD_BYTES)
    file_name = file.filename or "payload.txt"
    # Prevent path traversal in client-supplied name
    file_name = _Path(file_name).name
    ext = _Path(file_name).suffix.lower()
    if ext and ext not in ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed ({ext}). Allowed: {sorted(ALLOWED_UPLOAD_EXTENSIONS)}",
        )
    ctype = (file.content_type or "").split(";")[0].strip().lower()
    if ctype and ctype not in ALLOWED_UPLOAD_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Content-Type not allowed: {ctype}",
        )

    raw = await file.read()
    if len(raw) > max_bytes:
        raise HTTPException(status_code=400, detail=f"File too large (max {max_bytes} bytes)")
    data = AttackDocumentCreate(
        name=name,
        description=description,
        technique=technique,
        category_code=category_code,  # type: ignore[arg-type]
        scope=scope,  # type: ignore[arg-type]
        file_name=file_name,
        doc_version=doc_version,
    )
    return attack_document_service.create_document(
        db,
        membership=membership,
        user=current_user,
        data=data,
        content_bytes=raw,
    )


@router.get("/{document_id}", response_model=AttackDocumentOut)
def get_attack_document(
    document_id: int,
    membership: OrganizationMember = Depends(require_read_role),
    db: Session = Depends(get_db),
):
    return attack_document_service.get_document(
        db, membership=membership, document_id=document_id
    )


@router.get("/{document_id}/content")
def get_attack_document_content(
    document_id: int,
    membership: OrganizationMember = Depends(require_read_role),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Payload body + extracted canaries. Readable by org members; global too."""
    return attack_document_service.get_document_content(
        db, membership=membership, user=current_user, document_id=document_id
    )


@router.delete("/{document_id}", status_code=204)
def delete_attack_document(
    document_id: int,
    membership: OrganizationMember = Depends(require_write_role),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    attack_document_service.deactivate_document(
        db, membership=membership, user=current_user, document_id=document_id
    )
    return None
