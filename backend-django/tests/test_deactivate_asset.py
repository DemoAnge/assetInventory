from datetime import date
from decimal import Decimal

import pytest

from apps.assets.models import Asset, AssetCategory, AssetStatus
from apps.assets.services import AssetDomainError, deactivate_asset
from apps.movements.models import AssetMovement, MovementType
from apps.users.models import CustomUser, Role


@pytest.fixture
def user(db):
    return CustomUser.objects.create_user(
        email="admin@example.com",
        password="password12345",
        first_name="Ada",
        last_name="Admin",
        role=Role.ADMIN,
    )


@pytest.fixture
def asset(db):
    return Asset.objects.create(
        asset_code="AST-001",
        name="Laptop prueba",
        category=AssetCategory.COMPUTO,
        purchase_value=Decimal("1000.00"),
        purchase_date=date(2024, 1, 15),
    )


def test_deactivate_asset_creates_baja_movement(user, asset, monkeypatch):
    monkeypatch.setattr("apps.assets.services.notify_role", lambda *a, **k: None)
    result = deactivate_asset(asset, user, reason="Fin de vida util del equipo")
    result.refresh_from_db()
    assert result.is_active is False
    assert result.status == AssetStatus.INACTIVO
    assert AssetMovement.objects.filter(
        asset=result, movement_type=MovementType.BAJA
    ).exists()


def test_deactivate_asset_rejects_active_components(user, asset, monkeypatch):
    monkeypatch.setattr("apps.assets.services.notify_role", lambda *a, **k: None)
    Asset.objects.create(
        asset_code="AST-002",
        name="Monitor",
        category=AssetCategory.COMPUTO,
        purchase_value=Decimal("200.00"),
        purchase_date=date(2024, 1, 15),
        parent_asset=asset,
        is_active=True,
    )
    with pytest.raises(AssetDomainError):
        deactivate_asset(asset, user, reason="Baja con componentes")
    asset.refresh_from_db()
    assert asset.is_active is True
