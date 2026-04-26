"""
Comando para sincronizar movimientos de BAJA para activos dados de baja
que no tienen registro de movimiento.

Uso:
    python manage.py sync_baja_movements
"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.assets.models import Asset
from apps.movements.models import AssetMovement, MovementType


class Command(BaseCommand):
    help = "Crea registros de movimiento BAJA para activos inactivos que no los tienen."

    def handle(self, *args, **options):
        # Activos inactivos sin ningún movimiento de tipo BAJA
        inactive_assets = Asset.objects.filter(is_active=False).prefetch_related("movements")

        assets_con_baja = set(
            AssetMovement.objects
            .filter(movement_type=MovementType.BAJA)
            .values_list("asset_id", flat=True)
        )

        pendientes = [a for a in inactive_assets if a.pk not in assets_con_baja]

        if not pendientes:
            self.stdout.write(self.style.SUCCESS("No hay bajas pendientes de sincronizar."))
            return

        self.stdout.write(f"Sincronizando {len(pendientes)} activo(s) sin movimiento de baja...")

        created = 0
        for asset in pendientes:
            baja_date = asset.deactivation_date or timezone.now().date()
            AssetMovement.objects.create(
                asset=asset,
                movement_type=MovementType.BAJA,
                movement_date=baja_date,
                origin_agency=asset.agency,
                origin_department=asset.department,
                origin_area=asset.area,
                origin_custodian=asset.custodian,
                reason="Baja registrada en el sistema (sincronización histórica).",
                is_cascade=False,
            )
            created += 1
            self.stdout.write(f"  OK: {asset.asset_code} - {asset.name}")

        self.stdout.write(self.style.SUCCESS(f"\n{created} movimiento(s) de baja creado(s)."))
