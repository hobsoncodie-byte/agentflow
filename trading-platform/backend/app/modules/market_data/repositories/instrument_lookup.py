from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.types import Symbol
from app.db.models.reference import Instrument
from app.modules.market_data.domain.models import InstrumentRef


class SqlAlchemyInstrumentLookup:
    """Read-only lookup against the shared `instruments` reference table.

    Market Data Engine reads instrument specs but never writes them — the
    Configuration Manager owns that table (ARCHITECTURE.md §4).
    """

    def __init__(self, session: Session) -> None:
        self._session = session

    def get_by_symbol(self, symbol: Symbol) -> InstrumentRef | None:
        row = self._session.execute(
            select(Instrument).where(Instrument.symbol == symbol.value, Instrument.active.is_(True))
        ).scalar_one_or_none()
        if row is None:
            return None
        return InstrumentRef(id=row.id, symbol=Symbol(row.symbol), tick_size=Decimal(str(row.tick_size)))
