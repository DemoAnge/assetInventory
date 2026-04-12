"""
Migration: Asset.custodian (FK CustomUser) → Asset.custodian (FK Custodian model).

Steps:
  1. Add custodian_ref (nullable FK to Custodian) — temp name to avoid collision.
  2. RunPython: for each unique custodian_id in Asset, create a Custodian record
     copying first_name, last_name, id_number from CustomUser. position is derived
     from user role as a fallback.
  3. Remove old custodian field (FK CustomUser).
  4. Rename custodian_ref → custodian (final field name).
"""
import django.db.models.deletion
from django.db import migrations, models


ROLE_POSITION_MAP = {
    "ADMIN":        "Administrator",
    "TI":           "IT Technician",
    "CONTABILIDAD": "Accountant",
    "AUDITOR":      "Auditor",
}


def migrate_custodians_forward(apps, schema_editor):
    CustomUser = apps.get_model("users",      "CustomUser")
    Custodian  = apps.get_model("custodians", "Custodian")
    Asset      = apps.get_model("assets",     "Asset")

    custodian_ids = (
        Asset.objects
        .exclude(custodian_id__isnull=True)
        .values_list("custodian_id", flat=True)
        .distinct()
    )

    user_to_custodian = {}

    for uid in custodian_ids:
        try:
            user = CustomUser.objects.get(pk=uid)
        except CustomUser.DoesNotExist:
            continue

        if not user.cedula:
            continue

        position = ROLE_POSITION_MAP.get(user.role, user.role)

        custodian, _ = Custodian.objects.get_or_create(
            id_number=user.cedula,
            defaults={
                "first_name": user.first_name,
                "last_name":  user.last_name,
                "position":   position,
                "is_active":  user.is_active,
            },
        )
        user_to_custodian[uid] = custodian.pk

    for uid, cid in user_to_custodian.items():
        Asset.objects.filter(custodian_id=uid).update(custodian_ref_id=cid)


class Migration(migrations.Migration):

    dependencies = [
        ("assets",     "0006_add_is_it_managed"),
        ("custodians", "0001_initial"),
    ]

    operations = [
        # 1. Add temp field
        migrations.AddField(
            model_name="asset",
            name="custodian_ref",
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="assets",
                to="custodians.custodian",
                verbose_name="Custodian",
            ),
        ),
        # 2. Migrate data
        migrations.RunPython(migrate_custodians_forward, migrations.RunPython.noop),
        # 3. Remove old FK to CustomUser
        migrations.RemoveField(model_name="asset", name="custodian"),
        # 4. Rename temp field to final name
        migrations.RenameField(
            model_name="asset",
            old_name="custodian_ref",
            new_name="custodian",
        ),
    ]
