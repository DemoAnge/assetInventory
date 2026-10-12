from django.db import migrations
from apps.shared.fields import EncryptedDecimalField


def encrypt_existing(apps, schema_editor):
    Asset = apps.get_model("assets", "Asset")
    fields = [
        "purchase_value",
        "residual_value",
        "current_value",
        "accumulated_depreciation",
    ]
    for asset in Asset.objects.iterator():
        asset.save(update_fields=fields)


class Migration(migrations.Migration):

    dependencies = [
        ("assets", "0013_account_code_add_depreciation"),
    ]

    operations = [
        migrations.AlterField(
            model_name="asset",
            name="purchase_value",
            field=EncryptedDecimalField(
                decimal_places=2, max_digits=14, verbose_name="Valor de compra"
            ),
        ),
        migrations.AlterField(
            model_name="asset",
            name="residual_value",
            field=EncryptedDecimalField(
                decimal_places=2, default=0, max_digits=14, verbose_name="Valor residual"
            ),
        ),
        migrations.AlterField(
            model_name="asset",
            name="current_value",
            field=EncryptedDecimalField(
                blank=True, decimal_places=2, max_digits=14, null=True, verbose_name="Valor en libros"
            ),
        ),
        migrations.AlterField(
            model_name="asset",
            name="accumulated_depreciation",
            field=EncryptedDecimalField(
                decimal_places=2, default=0, max_digits=14, verbose_name="Depreciación acumulada"
            ),
        ),
        migrations.RunPython(encrypt_existing, migrations.RunPython.noop),
    ]
