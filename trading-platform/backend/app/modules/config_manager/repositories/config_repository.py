from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.reference import ConfigVersion
from app.modules.config_manager.domain.models import ConfigVersionRecord


class SqlAlchemyConfigVersionRepository:
    """Postgres-backed implementation of ConfigVersionRepository."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def get_latest(self, module: str) -> ConfigVersionRecord | None:
        stmt = (
            select(ConfigVersion)
            .where(ConfigVersion.module == module)
            .order_by(ConfigVersion.version.desc())
            .limit(1)
        )
        row = self._session.execute(stmt).scalar_one_or_none()
        return self._to_record(row) if row is not None else None

    def get_history(self, module: str) -> list[ConfigVersionRecord]:
        stmt = (
            select(ConfigVersion)
            .where(ConfigVersion.module == module)
            .order_by(ConfigVersion.version.asc())
        )
        rows = self._session.execute(stmt).scalars().all()
        return [self._to_record(row) for row in rows]

    def add(self, record: ConfigVersionRecord) -> ConfigVersionRecord:
        row = ConfigVersion(
            module=record.module,
            version=record.version,
            config_json=record.config,
            is_risk_limit_change=record.is_risk_limit_change,
            applied_by=record.applied_by,
            note=record.note,
        )
        self._session.add(row)
        self._session.commit()
        self._session.refresh(row)
        return self._to_record(row)

    @staticmethod
    def _to_record(row: ConfigVersion) -> ConfigVersionRecord:
        return ConfigVersionRecord(
            id=row.id,
            module=row.module,
            version=row.version,
            config=row.config_json,
            is_risk_limit_change=row.is_risk_limit_change,
            applied_by=row.applied_by,
            note=row.note,
            applied_at=row.applied_at,
        )
