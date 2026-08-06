from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class Money:
    """An amount in a specific currency. Always Decimal — never float."""

    amount: Decimal
    currency: str = "USD"

    def __post_init__(self) -> None:
        if not isinstance(self.amount, Decimal):
            raise TypeError("Money.amount must be a Decimal")
        if not self.currency:
            raise ValueError("Money.currency must not be empty")

    def __add__(self, other: "Money") -> "Money":
        self._assert_same_currency(other)
        return Money(self.amount + other.amount, self.currency)

    def __sub__(self, other: "Money") -> "Money":
        self._assert_same_currency(other)
        return Money(self.amount - other.amount, self.currency)

    def _assert_same_currency(self, other: "Money") -> None:
        if self.currency != other.currency:
            raise ValueError(f"currency mismatch: {self.currency} vs {other.currency}")


@dataclass(frozen=True)
class Symbol:
    """A validated instrument ticker, e.g. 'MES'."""

    value: str

    def __post_init__(self) -> None:
        if not self.value or not self.value.isupper() or not self.value.isalnum():
            raise ValueError(f"invalid symbol: {self.value!r}")

    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class RMultiple:
    """A trade outcome expressed as a multiple of initial risk (R)."""

    value: Decimal

    def __post_init__(self) -> None:
        if not isinstance(self.value, Decimal):
            raise TypeError("RMultiple.value must be a Decimal")
