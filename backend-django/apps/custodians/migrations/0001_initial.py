import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Custodian",
            fields=[
                ("id",         models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Date created")),
                ("updated_at", models.DateTimeField(auto_now=True,     verbose_name="Date updated")),
                ("first_name", models.CharField(max_length=100, verbose_name="First name")),
                ("last_name",  models.CharField(max_length=100, verbose_name="Last name")),
                ("id_number",  models.CharField(max_length=13, unique=True, verbose_name="ID / Tax number")),
                ("position",   models.CharField(max_length=150, verbose_name="Job position")),
                ("is_active",  models.BooleanField(
                    default=True,
                    help_text="Logical deactivation. Record is never deleted to preserve historical traceability.",
                    verbose_name="Active",
                )),
                ("created_by", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="custodians_custodian_created",
                    to=settings.AUTH_USER_MODEL,
                    verbose_name="Created by",
                )),
                ("updated_by", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="custodians_custodian_updated",
                    to=settings.AUTH_USER_MODEL,
                    verbose_name="Updated by",
                )),
            ],
            options={
                "verbose_name": "Custodian",
                "verbose_name_plural": "Custodians",
                "ordering": ["last_name", "first_name"],
            },
        ),
        migrations.AddIndex(
            model_name="custodian",
            index=models.Index(fields=["id_number"],               name="idx_custodian_id_number"),
        ),
        migrations.AddIndex(
            model_name="custodian",
            index=models.Index(fields=["last_name", "first_name"], name="idx_custodian_name"),
        ),
        migrations.AddIndex(
            model_name="custodian",
            index=models.Index(fields=["is_active"],               name="idx_custodian_active"),
        ),
    ]
