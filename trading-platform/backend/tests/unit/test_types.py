from decimal import Decimal

import pytest

from app.core.types import Money, RMultiple, Symbol


def test_money_addition_same_currency():
    a = Money(Decimal("100.00"), "USD")
    b = Money(Decimal("50.00"), "USD")
    assert (a + b) == Money(Decimal("150.00"), "USD")


def test_money_rejects_float_amount():
    with pytest.raises(TypeError):
        Money(100.0, "USD")  # type: ignore[arg-type]


def test_money_rejects_currency_mismatch():
    a = Money(Decimal("100.00"), "USD")
    b = Money(Decimal("50.00"), "EUR")
    with pytest.raises(ValueError):
        a + b


def test_symbol_rejects_lowercase():
    with pytest.raises(ValueError):
        Symbol("mes")


def test_symbol_accepts_valid_ticker():
    assert str(Symbol("MES")) == "MES"


def test_rmultiple_rejects_non_decimal():
    with pytest.raises(TypeError):
        RMultiple(1.5)  # type: ignore[arg-type]
