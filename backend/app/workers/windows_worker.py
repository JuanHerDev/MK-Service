"""RQ worker for Windows (no os.fork, no signal.SIGALRM)."""

from __future__ import annotations

from rq.timeouts import BaseDeathPenalty
from rq.worker import SimpleWorker


class NoDeathPenalty(BaseDeathPenalty):
    """Disable job time limits that rely on Unix signals."""

    def setup_death_penalty(self) -> None:
        return

    def cancel_death_penalty(self) -> None:
        return


class WindowsWorker(SimpleWorker):
    """SimpleWorker + no SIGALRM. Use only on Windows dev machines."""

    death_penalty_class = NoDeathPenalty
