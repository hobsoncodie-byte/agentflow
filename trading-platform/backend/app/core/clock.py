from dataclasses import dataclass
from datetime import UTC, datetime, time
from zoneinfo import ZoneInfo


class Clock:
    """Single source of truth for 'now' across the whole application.

    No module should call datetime.now()/datetime.utcnow() directly — going
    through Clock means tests can inject a fixed instant and every module
    agrees on what time it is, which matters for session-window enforcement.
    """

    @staticmethod
    def utcnow() -> datetime:
        return datetime.now(UTC)


@dataclass(frozen=True)
class SessionWindow:
    """A named trading session window, mirroring the `sessions` reference table."""

    name: str
    start_time: time
    end_time: time
    tz_name: str = "America/New_York"

    def __post_init__(self) -> None:
        if not self.name:
            raise ValueError("SessionWindow.name must not be empty")

    def contains(self, instant: datetime) -> bool:
        """Whether `instant` (any timezone-aware datetime) falls within this window."""
        if instant.tzinfo is None:
            raise ValueError("instant must be timezone-aware")

        local = instant.astimezone(ZoneInfo(self.tz_name))
        local_time = local.time()

        if self.start_time <= self.end_time:
            return self.start_time <= local_time <= self.end_time
        # window crosses midnight in the session's local timezone
        return local_time >= self.start_time or local_time <= self.end_time
