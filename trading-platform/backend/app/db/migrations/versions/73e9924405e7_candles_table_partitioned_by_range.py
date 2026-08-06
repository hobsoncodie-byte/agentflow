"""candles table partitioned by range

Revision ID: 73e9924405e7
Revises: 0c159999d0a7
Create Date: 2026-08-05 12:26:38.990418

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '73e9924405e7'
down_revision: str | None = '0c159999d0a7'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Native Postgres range partitioning on event_time (DATABASE.md §3, §11).
    # A DEFAULT partition catches any row outside the explicitly created
    # monthly partitions — real deployments create monthly partitions ahead
    # of time via a scheduled maintenance job (ARCHITECTURE.md §5,
    # app/workers/, not yet built — tracked as follow-up work, not a
    # Milestone 2 requirement); the default partition means writes never
    # fail for lack of a partition in the meantime.
    op.create_table(
        "candles",
        sa.Column("id", sa.BigInteger(), sa.Identity(), nullable=False),
        sa.Column("instrument_id", sa.SmallInteger(), nullable=False),
        sa.Column("timeframe", sa.String(), nullable=False),
        sa.Column("event_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("open", sa.Numeric(), nullable=False),
        sa.Column("high", sa.Numeric(), nullable=False),
        sa.Column("low", sa.Numeric(), nullable=False),
        sa.Column("close", sa.Numeric(), nullable=False),
        sa.Column("volume", sa.Numeric(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.ForeignKeyConstraint(["instrument_id"], ["instruments.id"]),
        sa.PrimaryKeyConstraint("id", "event_time"),
        postgresql_partition_by="RANGE (event_time)",
    )
    op.create_index(
        "ix_candles_instrument_timeframe_time",
        "candles",
        ["instrument_id", "timeframe", "event_time"],
        unique=True,
    )
    op.execute("CREATE TABLE candles_default PARTITION OF candles DEFAULT")


def downgrade() -> None:
    # Dropping the partitioned parent cascades to its attached partitions.
    op.execute("DROP TABLE candles")
