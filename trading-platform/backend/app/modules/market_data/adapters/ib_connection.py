from ib_async import IB

from app.core.config import Settings

# NOT YET VERIFIED against a real TWS/IB Gateway — see KNOWN_ISSUES.md #1 and
# InteractiveBrokersMarketDataProvider's docstring. This connects to an
# already-running, already-logged-in TWS or IB Gateway process; it does not
# start one or hold any account credentials itself.


async def connect_ib(settings: Settings) -> IB:
    ib = IB()
    await ib.connectAsync(settings.ib_host, settings.ib_port, clientId=settings.ib_client_id)
    return ib


async def disconnect_ib(ib: IB) -> None:
    if ib.isConnected():
        ib.disconnect()
