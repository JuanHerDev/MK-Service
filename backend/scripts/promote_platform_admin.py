"""Promote an existing user to platform admin.

Usage (from backend/, venv active):
  python scripts/promote_platform_admin.py you@email.com
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal
from app.models.user import User


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python scripts/promote_platform_admin.py <email>")
        sys.exit(1)
    email = sys.argv[1].strip().lower()
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"User not found: {email}")
            sys.exit(1)
        user.is_platform_admin = True
        db.commit()
        print(f"OK: {email} is now platform admin (is_platform_admin=True)")
        print("Log out and log in again so the JWT/session reflects the flag.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
