"""
Canary token extraction utilities. Single source of truth for canary tokens.
"""

from __future__ import annotations

import re

# Canonical tokens used in sample seed files (optional). Any MK_CANARY_* in a
# user-uploaded document is equally valid — extracted at runtime from file bytes.
CANARY_PI = "MK_CANARY_PI_2b8e1d"
CANARY_LEAK = "MK_CANARY_LEAK_7f3a9c"
CANARY_INDIRECT = "MK_CANARY_INDIRECT_9d4e2a"

CANARY_PATTERN = re.compile(r"MK_CANARY_[A-Z0-9_]+")


def extract_canaries(text: str) -> list[str]:
    """Unique canary tokens found in payload text, order preserved."""
    if not text:
        return []
    found = CANARY_PATTERN.findall(text)
    return list(dict.fromkeys(found))
