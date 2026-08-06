from dataclasses import dataclass

from app.core.events import EventBus


@dataclass
class CandleClosed:
    symbol: str


async def test_publish_calls_sync_handler():
    bus = EventBus()
    received = []
    bus.subscribe(CandleClosed, lambda e: received.append(e))

    await bus.publish(CandleClosed(symbol="MES"))

    assert received == [CandleClosed(symbol="MES")]


async def test_publish_calls_async_handler():
    bus = EventBus()
    received = []

    async def handler(event: CandleClosed) -> None:
        received.append(event)

    bus.subscribe(CandleClosed, handler)
    await bus.publish(CandleClosed(symbol="ES"))

    assert received == [CandleClosed(symbol="ES")]


async def test_publish_ignores_unrelated_event_types():
    bus = EventBus()
    received = []
    bus.subscribe(CandleClosed, lambda e: received.append(e))

    @dataclass
    class OtherEvent:
        pass

    await bus.publish(OtherEvent())

    assert received == []
