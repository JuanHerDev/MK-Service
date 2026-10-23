"""Write default global payload files under storage/payloads/global/."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.storage import ensure_seed_payloads, storage_root


def main() -> None:
    written = ensure_seed_payloads()
    print(f"storage root: {storage_root()}")
    print(f"created: {written or '(all already present)'}")


if __name__ == "__main__":
    main()