"""
Migración: Normalización 2FN/3FN
- Crea tablas catálogo: assets_brand, assets_assettype, assets_assetmodel
- Agrega FK asset_model_id a assets_asset
- Elimina campos de texto brand y model_name de assets_asset
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("assets", "0003_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ── 1. Tabla Brand ────────────────────────────────────────────────────
        migrations.CreateModel(
            name="Brand",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Fecha creación")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Fecha actualización")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assets_brand_created", to=settings.AUTH_USER_MODEL, verbose_name="Creado por")),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assets_brand_updated", to=settings.AUTH_USER_MODEL, verbose_name="Actualizado por")),
                ("name",    models.CharField(max_length=100, unique=True, verbose_name="Marca")),
                ("country", models.CharField(blank=True, max_length=100, verbose_name="País de origen")),
                ("website", models.URLField(blank=True, verbose_name="Sitio web")),
            ],
            options={"verbose_name": "Marca", "verbose_name_plural": "Marcas", "ordering": ["name"]},
        ),

        # ── 2. Tabla AssetType ────────────────────────────────────────────────
        migrations.CreateModel(
            name="AssetType",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Fecha creación")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Fecha actualización")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assets_assettype_created", to=settings.AUTH_USER_MODEL, verbose_name="Creado por")),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assets_assettype_updated", to=settings.AUTH_USER_MODEL, verbose_name="Actualizado por")),
                ("name",        models.CharField(max_length=100, unique=True, verbose_name="Tipo de activo")),
                ("category",    models.CharField(max_length=20, choices=[("COMPUTO","Equipo de cómputo"),("VEHICULO","Vehículo"),("MAQUINARIA","Maquinaria y equipo"),("MUEBLE","Mueble y ensere"),("INMUEBLE","Inmueble / Edificio"),("TELECOMUNICACION","Telecomunicaciones"),("OTRO","Otro")], verbose_name="Categoría LORTI")),
                ("description", models.TextField(blank=True, verbose_name="Descripción")),
            ],
            options={"verbose_name": "Tipo de activo", "verbose_name_plural": "Tipos de activo", "ordering": ["category", "name"]},
        ),

        # ── 3. Tabla AssetModel ───────────────────────────────────────────────
        migrations.CreateModel(
            name="AssetModel",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Fecha creación")),
                ("updated_at", models.DateTimeField(auto_now=True, verbose_name="Fecha actualización")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assets_assetmodel_created", to=settings.AUTH_USER_MODEL, verbose_name="Creado por")),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assets_assetmodel_updated", to=settings.AUTH_USER_MODEL, verbose_name="Actualizado por")),
                ("brand",      models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="models", to="assets.brand", verbose_name="Marca")),
                ("asset_type", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="models", to="assets.assettype", verbose_name="Tipo")),
                ("name",  models.CharField(max_length=150, verbose_name="Nombre del modelo")),
                ("specs", models.TextField(blank=True, verbose_name="Especificaciones técnicas base")),
            ],
            options={"verbose_name": "Modelo de activo", "verbose_name_plural": "Modelos de activo", "ordering": ["brand__name", "name"]},
        ),
        migrations.AddConstraint(
            model_name="assetmodel",
            constraint=models.UniqueConstraint(fields=["brand", "name"], name="uq_assetmodel_brand_name"),
        ),

        # ── 4. FK asset_model en Asset (nullable para migración sin pérdida) ──
        migrations.AddField(
            model_name="asset",
            name="asset_model",
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="assets",
                to="assets.assetmodel",
                verbose_name="Modelo del activo",
            ),
        ),

        # ── 5. Eliminar campos de texto brand y model_name ───────────────────
        migrations.RemoveField(model_name="asset", name="brand"),
        migrations.RemoveField(model_name="asset", name="model_name"),
    ]
