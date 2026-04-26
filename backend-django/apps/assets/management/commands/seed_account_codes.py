"""
Comando para poblar el catálogo de cuentas contables.
Uso:
    python manage.py seed_account_codes
    python manage.py seed_account_codes --reset
"""
from django.core.management.base import BaseCommand
from apps.assets.models import AccountCode

ACCOUNT_CODES = [
    # ── Activos fijos ──────────────────────────────────────── years  rate
    { "code": "1501",   "name": "Terrenos",                      "category": "INMUEBLE",         "years": None,  "rate": None,   "description": "Terrenos de propiedad de la institución. No se deprecian." },
    { "code": "1502",   "name": "Edificios y construcciones",    "category": "INMUEBLE",         "years": 20,    "rate": 5.00,   "description": "Inmuebles, locales y obras civiles." },
    { "code": "1503",   "name": "Maquinaria y equipo",           "category": "MAQUINARIA",       "years": 10,    "rate": 10.00,  "description": "Maquinaria industrial y equipos de producción." },
    { "code": "1504",   "name": "Muebles y enseres",             "category": "MUEBLE",           "years": 10,    "rate": 10.00,  "description": "Mobiliario, sillas, escritorios y similares." },
    { "code": "1505",   "name": "Equipos de cómputo",            "category": "COMPUTO",          "years": 3,     "rate": 33.33,  "description": "Computadoras, laptops, servidores y periféricos." },
    { "code": "1506",   "name": "Vehículos",                     "category": "VEHICULO",         "years": 5,     "rate": 20.00,  "description": "Vehículos de transporte y carga." },
    { "code": "1507",   "name": "Equipos de telecomunicación",   "category": "TELECOMUNICACION", "years": 5,     "rate": 20.00,  "description": "Switches, routers, teléfonos IP y redes." },
    { "code": "1508",   "name": "Otros activos fijos",           "category": "OTRO",             "years": 10,    "rate": 10.00,  "description": "Activos fijos que no corresponden a categorías anteriores." },

    # ── Depreciación acumulada (cuentas contra-activo) ────────────────
    { "code": "1502.D", "name": "Dep. acum. — Edificios",        "category": "INMUEBLE",         "years": None,  "rate": None,   "description": "Depreciación acumulada de edificios y construcciones." },
    { "code": "1503.D", "name": "Dep. acum. — Maquinaria",       "category": "MAQUINARIA",       "years": None,  "rate": None,   "description": "Depreciación acumulada de maquinaria y equipo." },
    { "code": "1504.D", "name": "Dep. acum. — Muebles",          "category": "MUEBLE",           "years": None,  "rate": None,   "description": "Depreciación acumulada de muebles y enseres." },
    { "code": "1505.D", "name": "Dep. acum. — Cómputo",          "category": "COMPUTO",          "years": None,  "rate": None,   "description": "Depreciación acumulada de equipos de cómputo." },
    { "code": "1506.D", "name": "Dep. acum. — Vehículos",        "category": "VEHICULO",         "years": None,  "rate": None,   "description": "Depreciación acumulada de vehículos." },
    { "code": "1507.D", "name": "Dep. acum. — Telecomunicación", "category": "TELECOMUNICACION", "years": None,  "rate": None,   "description": "Depreciación acumulada de equipos de telecomunicación." },
    { "code": "1508.D", "name": "Dep. acum. — Otros activos",    "category": "OTRO",             "years": None,  "rate": None,   "description": "Depreciación acumulada de otros activos fijos." },
]


class Command(BaseCommand):
    help = "Pobla el catálogo de cuentas contables con datos iniciales."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Elimina todas las cuentas existentes antes de insertar.",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            deleted, _ = AccountCode.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"  {deleted} cuentas eliminadas."))

        created = updated = 0

        for item in ACCOUNT_CODES:
            obj, was_created = AccountCode.objects.update_or_create(
                code=item["code"],
                defaults={
                    "name":               item["name"],
                    "category":           item.get("category"),
                    "useful_life_years":  item.get("years"),
                    "depreciation_rate":  item.get("rate"),
                    "description":        item.get("description", ""),
                    "is_active":          True,
                },
            )
            symbol = "+" if was_created else "~"
            rate_str = f"{item['rate']}%" if item.get("rate") else "sin depreciación"
            years_str = f"{item['years']} años" if item.get("years") else "—"
            self.stdout.write(f"  {symbol} {obj.code:<10} {obj.name:<40} {years_str:<10} {rate_str}")
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(self.style.SUCCESS(
            f"\nListo: {created} creadas, {updated} actualizadas."
        ))
