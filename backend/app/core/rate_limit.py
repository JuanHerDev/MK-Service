"""Simple in-process rate limiter (per worker)"""
from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request, status

_lock = Lock()
# key -> deque of timestamps
_hits: dict[str, deque[float]] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def check_rate_limit(
    request: Request,
    *,
    scope: str,
    limit: int,
    window_seconds: int,
) -> None:
    """Raise 429 if too many requests for (ip, scope) within window."""
    if limit <= 0:
        return
    now = time.monotonic()
    key = f"{scope}:{_client_ip(request)}"
    with _lock:
        q = _hits[key]
        cutoff = now - window_seconds
        while q and q[0] < cutoff:
            q.popleft()
        if len(q) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded for {scope}. Try again later.",
                headers={"Retry-After": str(window_seconds)},
            )
        q.append(now)
