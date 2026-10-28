"""Seed control_v1 payload pack into storage + attack_documents (global).

Usage:
  cd backend
  python scripts/seed_control_payloads.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal
from app.core.storage import storage_root, write_payload
from app.models.attack_document import AttackDocument
from app.models.finding import AttackCategory
from app.models.user import User

PACK = Path(__file__).resolve().parents[1] / "payload_packs" / "control_v1"


def main() -> None:
    manifest = json.loads((PACK / "manifest.json").read_text(encoding="utf-8"))
    db = SessionLocal()
    try:
        cats = {
            c.category_code: c
            for c in db.query(AttackCategory).filter(AttackCategory.is_active.is_(True)).all()
        }
        if not cats:
            print("ERROR: attack categories not seeded. Run seed_catalogs first.")
            sys.exit(1)

        admin = (
            db.query(User)
            .filter(User.is_platform_admin.is_(True))
            .order_by(User.user_id.asc())
            .first()
        )
        created_by = admin.user_id if admin else None

        n_files = 0
        n_db = 0
        for row in manifest:
            src = PACK / row["file"]
            if not src.is_file():
                print("skip missing", row["file"])
                continue
            content = src.read_bytes()
            rel = f"payloads/global/control_v1/{row['file']}"
            write_payload(relative_path=rel, content=content)
            n_files += 1

            cat = cats.get(row["category"])
            if not cat:
                print("unknown category", row["category"], "for", row["id"])
                continue

            existing = (
                db.query(AttackDocument)
                .filter(
                    AttackDocument.scope == "global",
                    AttackDocument.file_name == row["file"],
                    AttackDocument.is_active.is_(True),
                )
                .first()
            )
            if existing:
                existing.storage_path = rel
                existing.size_bytes = len(content)
                existing.technique = row["technique"]
                existing.name = f"{row['id']} · {row['technique']}"
                existing.attack_category_id = cat.attack_category_id
                n_db += 1
                continue

            db.add(
                AttackDocument(
                    organization_id=None,
                    attack_category_id=cat.attack_category_id,
                    name=f"{row['id']} · {row['technique']}",
                    description=f"control_v1 pack · expect={row.get('expect')}",
                    technique=row["technique"],
                    scope="global",
                    file_name=row["file"],
                    storage_path=rel,
                    size_bytes=len(content),
                    doc_version="1.0",
                    is_active=True,
                    created_by=created_by,
                )
            )
            n_db += 1

        db.commit()
        print(f"OK: wrote {n_files} files under storage; upserted {n_db} attack_documents (global)")
        print("Suggested G1-Smoke document ids: filter name starting C-P01, C-B01, I-01-A, L-D01-A, D-01-A")
    finally:
        db.close()


if __name__ == "__main__":
    main()
