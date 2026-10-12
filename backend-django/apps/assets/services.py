"""
Operaciones de dominio de activos.

La baja y la reactivación viven aquí para que el ViewSet no importe
apps.movements ni duplique la creación del movimiento BAJA/REACTIVACION.
"""
from django.db import transaction
from django.utils import timezone

from apps.audit.models import AuditAction, AuditLog
from apps.movements.models import AssetMovement, MovementType
from apps.shared.notifier import notify_role
from .models import Asset, AssetStatus


class AssetDomainError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code


@transaction.atomic
def deactivate_asset(
    asset: Asset,
    user,
    *,
    reason: str,
    deactivation_date=None,
    ip_address=None,
    extra_data=None,
) -> Asset:
    if asset.components.filter(is_active=True).exists():
        raise AssetDomainError("No se puede dar de baja un activo con componentes activos.")

    baja_date = deactivation_date or timezone.now().date()
    orig_agency = asset.agency
    orig_department = asset.department
    orig_area = asset.area
    orig_custodian = asset.custodian

    asset.is_active = False
    asset.status = AssetStatus.INACTIVO
    asset.deactivation_date = baja_date
    asset.save(update_fields=["is_active", "status", "deactivation_date"])

    AssetMovement.objects.create(
        asset=asset,
        movement_type=MovementType.BAJA,
        movement_date=baja_date,
        origin_agency=orig_agency,
        origin_department=orig_department,
        origin_area=orig_area,
        origin_custodian=orig_custodian,
        reason=reason,
        created_by=user,
    )
    AuditLog.objects.create(
        user=user,
        action=AuditAction.ASSET_DEACTIVATION,
        model="Asset",
        object_id=asset.pk,
        object_code=asset.asset_code,
        object_name=asset.name,
        module="assets",
        extra_data=extra_data or {},
        ip_address=ip_address,
    )
    notify_role(
        "ADMIN",
        "Activo dado de baja",
        f"{asset.asset_code} — {asset.name}: {reason[:80]}",
        type_="warning",
        module="assets",
    )
    return asset


@transaction.atomic
def reactivate_asset(
    asset: Asset,
    user,
    *,
    new_status: str,
    reason: str,
    ip_address=None,
) -> Asset:
    valid_statuses = [s.value for s in AssetStatus if s != AssetStatus.INACTIVO]
    if new_status not in valid_statuses:
        raise AssetDomainError(f"Estado inválido. Opciones: {', '.join(valid_statuses)}")
    if len(reason) < 10:
        raise AssetDomainError("El motivo debe tener al menos 10 caracteres.")

    asset.is_active = True
    asset.status = new_status
    asset.deactivation_date = None
    asset.save(update_fields=["is_active", "status", "deactivation_date"])

    AssetMovement.objects.create(
        asset=asset,
        movement_type=MovementType.REACTIVACION,
        movement_date=timezone.now().date(),
        origin_agency=asset.agency,
        origin_department=asset.department,
        origin_area=asset.area,
        origin_custodian=asset.custodian,
        dest_agency=asset.agency,
        dest_custodian=asset.custodian,
        reason=reason,
        created_by=user,
    )
    AuditLog.objects.create(
        user=user,
        action=AuditAction.ASSET_ACTIVATION,
        model="Asset",
        object_id=asset.pk,
        object_code=asset.asset_code,
        object_name=asset.name,
        module="assets",
        extra_data={"reason": reason, "new_status": new_status},
        ip_address=ip_address,
    )
    notify_role(
        "ADMIN",
        "Activo reactivado",
        f"{asset.asset_code} — {asset.name} volvió al estado '{new_status}'",
        type_="success",
        module="assets",
    )
    return asset
