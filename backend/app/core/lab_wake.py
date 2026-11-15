"""Wake cold-started lab services (e.g. Render free tier) before campaigns hit them."""
from __future__ import annotations

import logging
import threading
import time
from urllib.parse import urlparse

import httpx

from app.core.config import settings

logger = logging.getLogger("mk.lab_wake")

_lock = threading.Lock()
_last_wake_mono: float = 0.0


def _wake_urls() -> list[str]:
    raw = (settings.lab_wake_url or "").strip()
    if not raw:
        return []
    out: list[str] = []
    seen: set[str] = set()
    for part in raw.split(","):
        u = part.strip().rstrip("/")
        if not u:
            continue
        if not u.endswith("/health"):
            u = f"{u}/health"
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def _ping_one(url: str, timeout: float) -> bool:
    try:
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            r = client.get(url)
            logger.info("lab_wake %s -> HTTP %s", url, r.status_code)
            return r.status_code < 500
    except Exception as exc:  # noqa: BLE001
        logger.warning("lab_wake failed %s: %s", url, exc)
        return False


def _wait_until_up(urls: list[str], wait_seconds: float, timeout: float) -> None:
    deadline = time.monotonic() + max(0.0, wait_seconds)
    while time.monotonic() < deadline:
        if any(_ping_one(u, timeout) for u in urls):
            return
        time.sleep(2.0)
    logger.warning("lab_wake: lab still cold after %.0fs", wait_seconds)


def wake_lab_services(*, force: bool = False, wait: bool | None = None) -> None:
    """Ping lab URL(s). If lab_wake_wait_seconds > 0 and wait is not False, also poll until up.

    Background thread always starts a ping. Optional wait runs in the caller thread
    (use on campaign start so probes begin after the lab accepts traffic).
    """
    urls = _wake_urls()
    if not urls:
        return

    interval = max(0, int(settings.lab_wake_min_interval_seconds or 0))
    global _last_wake_mono
    now = time.monotonic()
    with _lock:
        if not force and interval and (now - _last_wake_mono) < interval:
            return
        _last_wake_mono = now

    timeout = float(settings.lab_wake_timeout_seconds or 15.0)
    wait_s = float(settings.lab_wake_wait_seconds or 0)
    do_wait = wait if wait is not None else (wait_s > 0)

    def _bg() -> None:
        for url in urls:
            _ping_one(url, timeout)

    threading.Thread(target=_bg, name="mk-lab-wake", daemon=True).start()

    if do_wait and wait_s > 0:
        _wait_until_up(urls, wait_s, timeout)


def target_looks_like_lab(chat_endpoint: str | None) -> bool:
    if not chat_endpoint:
        return False
    try:
        host = (urlparse(chat_endpoint).hostname or "").lower()
    except Exception:
        return False
    if not host:
        return False
    needles = [
        n.strip().lower()
        for n in (
            settings.lab_wake_host_substring
            or "onrender.com,localhost,127.0.0.1,mk-rag,rag-lab,rag_lab"
        ).split(",")
        if n.strip()
    ]
    return any(n in host for n in needles)
