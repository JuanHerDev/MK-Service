"""Seed roles, statuses, modes, severities, categories and global attack documents.

Usage (from backend/ with venv active):
  python scripts/seed_catalogs.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal
from app.models.attack_document import AttackDocument
from app.models.campaign import CampaignStatus
from app.models.finding import AttackCategory, FindingStatus, Severity
from app.models.role import Role
from app.models.target import ConnectionMode
from app.models.user import UserStatus

ROLES = [
    ("admin", "Admin de plataforma", "Control de plataforma MK Service (no confundir con superuser de BD)", True),
    ("owner", "Owner", "Organization owner", False),
    ("auditor", "Auditor", "Runs campaigns and manages findings", False),
    ("viewer", "Viewer", "Read-only access to reports and backlog", False),
]

STATUSES = [
    ("active", "Active", "Can sign in"),
    ("invited", "Invited", "Pending activation"),
    ("disabled", "Disabled", "Account disabled"),
    ("blocked", "Blocked", "Blocked for security"),
    ("pending", "Pending verification", "Email not verified"),
]

MODES = [
    ("basic", "Basic", "Chat endpoint only. Direct Prompt Injection"),
    ("complete", "Complete", "Chat + document upload. Indirect PI and Data Leakage"),
]

CAMPAIGN_STATUSES = [
    ("queued", "Queued", "Created and waiting"),
    ("running", "Running", "In progress"),
    ("completed", "Completed", "Finished successfully"),
    ("failed", "Failed", "Ended with error"),
    ("cancelled", "Cancelled", "Cancelled by user"),
]

SEVERITIES = [
    ("low", "Low", 1, "Minimal impact"),
    ("medium", "Medium", 2, "Moderate impact"),
    ("high", "High", 3, "Significant impact"),
    ("critical", "Critical", 4, "Severe immediate impact"),
]

FINDING_STATUSES = [
    ("open", "Open", "Initial state"),
    ("in_progress", "In progress", "Mitigation in progress"),
    ("resolved", "Resolved", "Mitigated"),
    ("false_positive", "False positive", "Not a real issue"),
    ("accepted_risk", "Accepted risk", "Risk accepted"),
]

ATTACK_CATEGORIES = [
    ("prompt_injection_direct", "Direct Prompt Injection", "Malicious instructions in user query"),
    ("prompt_injection_indirect", "Indirect Prompt Injection", "Hidden instructions in documents"),
    ("data_leakage", "Data Leakage", "Exposure of context, PII or secrets"),
]

# (name, category_code, technique, file_name)
GLOBAL_ATTACK_DOCS = [
    (
        "PI Direct override 01",
        "prompt_injection_direct",
        "instruction_override",
        "pi_direct_01.txt",
    ),
    (
        "PI Indirect payload 01",
        "prompt_injection_indirect",
        "indirect_canary",
        "pi_indirect_01.txt",
    ),
    (
        "Data leakage canary 01",
        "data_leakage",
        "canary_leak",
        "dl_canary_01.txt",
    ),
]


def main() -> None:
    db = SessionLocal()
    try:
        for code, name, desc, is_platform in ROLES:
            if not db.query(Role).filter(Role.role_code == code).first():
                db.add(
                    Role(
                        role_code=code,
                        role_name=name,
                        description=desc,
                        is_platform=is_platform,
                        is_active=True,
                    )
                )

        for code, name, desc in STATUSES:
            if not db.query(UserStatus).filter(UserStatus.status_code == code).first():
                db.add(
                    UserStatus(
                        status_code=code,
                        status_name=name,
                        description=desc,
                        is_active=True,
                    )
                )

        for code, name, desc in MODES:
            if not db.query(ConnectionMode).filter(ConnectionMode.mode_code == code).first():
                db.add(
                    ConnectionMode(
                        mode_code=code,
                        mode_name=name,
                        description=desc,
                        is_active=True,
                    )
                )

        for code, name, desc in CAMPAIGN_STATUSES:
            if not db.query(CampaignStatus).filter(CampaignStatus.status_code == code).first():
                db.add(
                    CampaignStatus(
                        status_code=code,
                        status_name=name,
                        description=desc,
                        is_active=True,
                    )
                )

        for code, name, level, desc in SEVERITIES:
            if not db.query(Severity).filter(Severity.severity_code == code).first():
                db.add(
                    Severity(
                        severity_code=code,
                        severity_name=name,
                        level=level,
                        description=desc,
                        is_active=True,
                    )
                )

        for code, name, desc in FINDING_STATUSES:
            if not db.query(FindingStatus).filter(FindingStatus.status_code == code).first():
                db.add(
                    FindingStatus(
                        status_code=code,
                        status_name=name,
                        description=desc,
                        is_active=True,
                    )
                )

        for code, name, desc in ATTACK_CATEGORIES:
            if not db.query(AttackCategory).filter(AttackCategory.category_code == code).first():
                db.add(
                    AttackCategory(
                        category_code=code,
                        category_name=name,
                        description=desc,
                        is_active=True,
                    )
                )

        # Flush so categories exist before global docs look them up
        db.flush()

        for name, cat_code, technique, file_name in GLOBAL_ATTACK_DOCS:
            exists = (
                db.query(AttackDocument)
                .filter(
                    AttackDocument.file_name == file_name,
                    AttackDocument.scope == "global",
                )
                .first()
            )
            if exists:
                continue
            cat = (
                db.query(AttackCategory)
                .filter(AttackCategory.category_code == cat_code)
                .first()
            )
            if not cat:
                continue
            db.add(
                AttackDocument(
                    organization_id=None,
                    attack_category_id=cat.attack_category_id,
                    name=name,
                    description="Seed global attack document (metadata only)",
                    technique=technique,
                    scope="global",
                    file_name=file_name,
                    storage_path=f"/storage/payloads/global/{file_name}",
                    size_bytes=512,
                    doc_version="1.0",
                    is_active=True,
                    created_by=None,
                )
            )

        db.commit()
        print(
            "Catalogs seeded: roles + user_statuses + connection_modes + "
            "campaign_statuses + severities + finding_statuses + "
            "attack_categories + global attack_documents"
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()