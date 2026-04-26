"""
Engine de reglas de alertas.
Ejecutar periódicamente (cron/celery) para detectar condiciones y generar alertas.
"""
from datetime import timedelta
from django.utils import timezone
from .models import Alert, AlertType, AlertSeverity


def run_alert_engine():
    """Ejecuta todas las reglas y genera alertas si no existen ya."""
    today = timezone.now().date()
    results = {
        "garantia_vence":     _check_warranty_expiring(today),
        "mantenimiento_due":  _check_maintenance_due(today),
        "depreciacion_total": _check_fully_depreciated(),
        "licencias_vencen":   _check_licenses_expiring(today),
    }
    return results


def _check_warranty_expiring(today):
    from apps.assets.models import Asset
    threshold = today + timedelta(days=30)
    assets = Asset.objects.filter(
        warranty_expiry__gte=today,
        warranty_expiry__lte=threshold,
        is_active=True,
    )
    count = 0
    for asset in assets:
        if not Alert.objects.filter(asset=asset, alert_type=AlertType.GARANTIA_VENCE, is_resolved=False).exists():
            Alert.objects.create(
                alert_type=AlertType.GARANTIA_VENCE,
                severity=AlertSeverity.ALTA,
                title=f"Garantía próxima a vencer — {asset.asset_code}",
                message=f"La garantía del activo {asset.name} ({asset.asset_code}) vence el {asset.warranty_expiry}.",
                asset=asset,
                target_roles=["ADMIN", "TI"],
                is_auto_generated=True,
            )
            count += 1
    return count


def _check_maintenance_due(today):
    from apps.maintenance.models import MaintenanceRecord, MaintenanceStatus
    threshold = today + timedelta(days=7)
    records = MaintenanceRecord.objects.filter(
        scheduled_date__gte=today,
        scheduled_date__lte=threshold,
        status=MaintenanceStatus.PROGRAMADO,
    ).select_related("asset")
    count = 0
    for r in records:
        if not Alert.objects.filter(asset=r.asset, alert_type=AlertType.MANTENIMIENTO_DUE, is_resolved=False).exists():
            Alert.objects.create(
                alert_type=AlertType.MANTENIMIENTO_DUE,
                severity=AlertSeverity.MEDIA,
                title=f"Mantenimiento próximo — {r.asset.asset_code}",
                message=f"El mantenimiento {r.get_maintenance_type_display()} del activo {r.asset.name} está programado para el {r.scheduled_date}.",
                asset=r.asset,
                target_roles=["ADMIN", "TI"],
                is_auto_generated=True,
            )
            count += 1
    return count


def _check_fully_depreciated():
    from apps.assets.models import Asset
    assets = Asset.objects.filter(is_fully_depreciated=True, is_active=True)
    count = 0
    for asset in assets:
        if not Alert.objects.filter(asset=asset, alert_type=AlertType.DEPRECIACION_TOTAL, is_resolved=False).exists():
            Alert.objects.create(
                alert_type=AlertType.DEPRECIACION_TOTAL,
                severity=AlertSeverity.BAJA,
                title=f"Activo totalmente depreciado — {asset.asset_code}",
                message=f"El activo {asset.name} ha alcanzado su vida útil según LORTI Art. 28. Considere la venta o baja.",
                asset=asset,
                target_roles=["ADMIN", "CONTABILIDAD"],
                is_auto_generated=True,
            )
            count += 1
    return count


def _check_licenses_expiring(today):
    from apps.it_module.models import SoftwareLicense
    threshold = today + timedelta(days=60)
    licenses = SoftwareLicense.objects.filter(
        expiry_date__gte=today,
        expiry_date__lte=threshold,
    )
    count = 0
    for lic in licenses:
        if not Alert.objects.filter(alert_type=AlertType.LICENCIA_VENCE, extra_data__license_id=lic.pk, is_resolved=False).exists():
            Alert.objects.create(
                alert_type=AlertType.LICENCIA_VENCE,
                severity=AlertSeverity.ALTA,
                title=f"Licencia próxima a vencer — {lic.software_name}",
                message=f"La licencia de {lic.software_name} v{lic.version} vence el {lic.expiry_date}. Tiene {lic.seats} licencias.",
                extra_data={"license_id": lic.pk, "software_name": lic.software_name},
                target_roles=["ADMIN", "TI"],
                is_auto_generated=True,
            )
            count += 1
    return count
