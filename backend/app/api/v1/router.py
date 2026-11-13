from fastapi import APIRouter

from app.api.v1 import auth, organizations, targets, campaigns, findings, attack_documents, reports, api_keys, invitations, audit, system, admin

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(organizations.router)
api_router.include_router(targets.router)
api_router.include_router(campaigns.router)
api_router.include_router(findings.router)
api_router.include_router(attack_documents.router)
api_router.include_router(reports.router)
api_router.include_router(api_keys.router)
api_router.include_router(invitations.router)
api_router.include_router(audit.router)
api_router.include_router(system.router)
api_router.include_router(admin.router)