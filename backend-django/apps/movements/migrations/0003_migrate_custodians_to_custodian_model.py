"""
Migration: AssetMovement.origin_custodian / dest_custodian (FK CustomUser)
           → origin_custodian / dest_custodian (FK Custodian model).

`authorized_by` stays as FK to CustomUser (system user who authorized the movement).
Temporary field names _ref are used to avoid collision with existing field names.
"""
import django.db.models.deletion
from django.db import migrations, models


ROLE_POSITION_MAP = {
    "ADMIN":        "Administrator",
    "TI":           "IT Technician",
    "CONTABILIDAD": "Accountant",
    "AUDITOR":      "Auditor",
}


def _get_or_create_custodian(apps, user):
    Custodian = apps.get_model("custodians", "Custodian")
    if not user or not user.cedula:
        return None
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
    return custodian


def migrate_movement_custodians(apps, schema_editor):
    CustomUser    = apps.get_model("users",     "CustomUser")
    AssetMovement = apps.get_model("movements", "AssetMovement")

    for movement in AssetMovement.objects.all():
        changed = False

        if movement.origin_custodian_id:
            try:
                user = CustomUser.objects.get(pk=movement.origin_custodian_id)
                c = _get_or_create_custodian(apps, user)
                if c:
                    movement.origin_custodian_ref_id = c.pk
                    changed = True
            except CustomUser.DoesNotExist:
                pass

        if movement.dest_custodian_id:
            try:
                user = CustomUser.objects.get(pk=movement.dest_custodian_id)
                c = _get_or_create_custodian(apps, user)
                if c:
                    movement.dest_custodian_ref_id = c.pk
                    changed = True
            except CustomUser.DoesNotExist:
                pass

        if changed:
            movement.save(update_fields=["origin_custodian_ref_id", "dest_custodian_ref_id"])


class Migration(migrations.Migration):

    dependencies = [
        ("movements",  "0002_initial"),
        ("custodians", "0001_initial"),
        ("assets",     "0007_migrate_custodian_to_custodian_model"),
    ]

    operations = [
        # 1. Add temp fields
        migrations.AddField(
            model_name="assetmovement",
            name="origin_custodian_ref",
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="movements_out",
                to="custodians.custodian",
                verbose_name="Origin custodian",
            ),
        ),
        migrations.AddField(
            model_name="assetmovement",
            name="dest_custodian_ref",
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="movements_in",
                to="custodians.custodian",
                verbose_name="Destination custodian",
            ),
        ),
        # 2. Migrate data
        migrations.RunPython(migrate_movement_custodians, migrations.RunPython.noop),
        # 3. Remove old FK fields (CustomUser)
        migrations.RemoveField(model_name="assetmovement", name="origin_custodian"),
        migrations.RemoveField(model_name="assetmovement", name="dest_custodian"),
        # 4. Rename to final names
        migrations.RenameField(model_name="assetmovement", old_name="origin_custodian_ref", new_name="origin_custodian"),
        migrations.RenameField(model_name="assetmovement", old_name="dest_custodian_ref",   new_name="dest_custodian"),
    ]
