"""
Comando de gestión: limpia TODOS los datos de la base de datos
y crea un único usuario ADMIN para pruebas.

Uso:
    python manage.py reset_and_seed
"""
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "Limpia toda la base de datos y crea un usuario admin de prueba."

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Eliminando todos los datos..."))

        # Orden de borrado respetando FK (hijos antes que padres)
        tables_in_order = [
            # TI
            "it_module_softwarelicense_assets",   # M2M
            "it_module_softwarelicense",
            "it_module_itassetprofile",
            # Movimientos y mantenimiento
            "movements_movementitem",
            "movements_movement",
            "maintenance_maintenancelog",
            "maintenance_maintenanceplan",
            # Activos (componentes antes que padres — ON DELETE SET NULL en parent_asset)
            "assets_asset",
            "assets_assetmodel",
            "assets_assettype",
            "assets_brand",
            # Custodios
            "custodians_custodian",
            # Ubicaciones (áreas → departamentos → agencias)
            "locations_area",
            "locations_department",
            "locations_agency",
            # Auditoría y seguridad
            "audit_auditlog",
            "security_securityevent",
            # Documentos
            "documents_document",
            # Auth tokens / sesiones Django
            "token_blacklist_outstandingtoken",
            "token_blacklist_blacklistedtoken",
            "authtoken_token",
            # Usuarios (LoginAttempt antes que CustomUser)
            "users_loginattempt",
            "users_customuser",
            # Django internals
            "django_session",
        ]

        with connection.cursor() as cursor:
            # Desactivar FK checks temporalmente (MySQL)
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
            for table in tables_in_order:
                try:
                    cursor.execute(f"DELETE FROM `{table}`;")
                    self.stdout.write(f"  ✓ {table}")
                except Exception as e:
                    self.stdout.write(self.style.NOTICE(f"  ~ {table}: {e}"))
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")

        self.stdout.write(self.style.SUCCESS("\nBase de datos limpia."))

        # Crear usuario admin
        from apps.users.models import CustomUser
        admin = CustomUser.objects.create_superuser(
            email="admin@sgacop.com",
            password="Admin1234*",
            first_name="Administrador",
            last_name="Sistema",
        )
        admin.role = "ADMIN"
        admin.is_staff = True
        admin.is_superuser = True
        admin.mfa_enabled = False
        admin.save()

        self.stdout.write(self.style.SUCCESS(
            "\nUsuario creado:"
            "\n   Email:      admin@sgacop.com"
            "\n   Contrasena: Admin1234*"
            "\n   Rol:        ADMIN"
            "\n   MFA:        desactivado"
        ))
