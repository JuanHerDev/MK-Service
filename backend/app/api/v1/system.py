
from fastapi import APIRouter, Depends

from app.core.deps import require_read_role
from app.core.queue import get_queue_status
from app.models.organization import OrganizationMember

router = APIRouter(prefix="/system", tags=["System"])


@router.get("/queue")
def queue_status(
    membership: OrganizationMember = Depends(require_read_role),
):
    """Estado de Redis/RQ (campañas asíncronas)."""
    return get_queue_status()
