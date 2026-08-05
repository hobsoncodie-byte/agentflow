from datetime import UTC, datetime, time

import pytest

from app.core.clock import Clock, SessionWindow


def test_utcnow_is_timezone_aware():
    now = Clock.utcnow()
    assert now.tzinfo is not None


def test_session_window_requires_name():
    with pytest.raises(ValueError):
        SessionWindow(name="", start_time=time(9, 20), end_time=time(10, 30))


def test_session_window_contains_within_ny_open():
    window = SessionWindow(name="ICT_NY_OPEN", start_time=time(9, 20), end_time=time(10, 30))
    # 14:00 UTC == 10:00 ET during EDT (UTC-4)
    instant = datetime(2026, 8, 5, 14, 0, tzinfo=UTC)
    assert window.contains(instant) is True


def test_session_window_excludes_outside_window():
    window = SessionWindow(name="ICT_NY_OPEN", start_time=time(9, 20), end_time=time(10, 30))
    instant = datetime(2026, 8, 5, 20, 0, tzinfo=UTC)  # 16:00 ET
    assert window.contains(instant) is False


def test_session_window_wraps_midnight():
    window = SessionWindow(name="OVERNIGHT", start_time=time(18, 0), end_time=time(9, 0))
    instant = datetime(2026, 8, 5, 3, 0, tzinfo=UTC)  # 23:00 ET prior day, within window
    assert window.contains(instant) is True


def test_session_window_rejects_naive_datetime():
    window = SessionWindow(name="ICT_NY_OPEN", start_time=time(9, 20), end_time=time(10, 30))
    with pytest.raises(ValueError):
        window.contains(datetime(2026, 8, 5, 14, 0))  # noqa: DTZ001 — deliberately naive, testing rejection
