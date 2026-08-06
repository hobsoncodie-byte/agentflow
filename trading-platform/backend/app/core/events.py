import inspect
from collections import defaultdict
from collections.abc import Callable
from typing import Any

Handler = Callable[[Any], Any]


class EventBus:
    """In-process publish/subscribe bus for cross-module notifications.

    Deliberately not a message queue: modules stay in one process (see
    ARCHITECTURE.md §3), and this bus exists only to decouple *who reacts*
    to an event from *who raised it* — e.g. Market Data Engine publishes
    CandleClosed without knowing which modules care.
    """

    def __init__(self) -> None:
        self._handlers: defaultdict[type[Any], list[Handler]] = defaultdict(list)

    def subscribe(self, event_type: type[Any], handler: Handler) -> None:
        self._handlers[event_type].append(handler)

    async def publish(self, event: Any) -> None:
        for handler in self._handlers[type(event)]:
            result = handler(event)
            if inspect.isawaitable(result):
                await result
