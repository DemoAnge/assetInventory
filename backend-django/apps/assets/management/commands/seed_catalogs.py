"""
Comando: seed_catalogs
Crea los tipos de activo base para todas las categorías LORTI.
Es idempotente: si el tipo ya existe, lo actualiza; si no, lo crea.

Uso:
    python manage.py seed_catalogs
"""
from django.core.management.base import BaseCommand
from apps.assets.models import AssetType


ASSET_TYPES = [
    # ── CÓMPUTO ──────────────────────────────────────────────────────────────
    {"name": "Laptop",               "category": "COMPUTO",          "code_prefix": "LAP",  "is_it_managed": True,  "description": "Computadora portátil",                           "component_type_link": None},
    {"name": "Desktop / PC",         "category": "COMPUTO",          "code_prefix": "PC",   "is_it_managed": True,  "description": "Computadora de escritorio",                      "component_type_link": None},
    {"name": "Servidor",             "category": "COMPUTO",          "code_prefix": "SRV",  "is_it_managed": True,  "description": "Servidor físico o torre",                        "component_type_link": None},
    {"name": "All-in-One",           "category": "COMPUTO",          "code_prefix": "AIO",  "is_it_managed": True,  "description": "PC con pantalla integrada",                      "component_type_link": None},
    {"name": "Tablet",               "category": "COMPUTO",          "code_prefix": "TAB",  "is_it_managed": True,  "description": "Tableta o iPad",                                 "component_type_link": None},
    {"name": "Impresora",            "category": "COMPUTO",          "code_prefix": "IMP",  "is_it_managed": False, "description": "Impresora láser o de inyección",                 "component_type_link": "IMPRESORA"},
    {"name": "Escáner",              "category": "COMPUTO",          "code_prefix": "ESC",  "is_it_managed": False, "description": "Escáner de documentos",                          "component_type_link": "CAMARA"},
    {"name": "Proyector",            "category": "COMPUTO",          "code_prefix": "PRY",  "is_it_managed": False, "description": "Proyector o videoproyector",                     "component_type_link": None},
    {"name": "UPS / Regulador",      "category": "COMPUTO",          "code_prefix": "UPS",  "is_it_managed": False, "description": "Unidad de alimentación ininterrumpida",          "component_type_link": "UPS"},
    {"name": "Monitor",              "category": "COMPUTO",          "code_prefix": "MON",  "is_it_managed": False, "description": "Monitor o pantalla",                             "component_type_link": "MONITOR"},
    {"name": "Teclado",              "category": "COMPUTO",          "code_prefix": "TEC",  "is_it_managed": False, "description": "Teclado",                                        "component_type_link": "TECLADO"},
    {"name": "Mouse",                "category": "COMPUTO",          "code_prefix": "MOU",  "is_it_managed": False, "description": "Mouse o ratón",                                  "component_type_link": "MOUSE"},
    {"name": "Parlante",             "category": "COMPUTO",          "code_prefix": "PAR",  "is_it_managed": False, "description": "Parlante o bocina",                              "component_type_link": "PARLANTE"},
    {"name": "Docking Station",      "category": "COMPUTO",          "code_prefix": "DOC",  "is_it_managed": False, "description": "Docking station o replicador de puertos",        "component_type_link": "DOCKING"},
    {"name": "Disco externo",        "category": "COMPUTO",          "code_prefix": "DSC",  "is_it_managed": False, "description": "Disco duro externo o adicional",                 "component_type_link": "DISCO"},
    {"name": "Módulo de memoria",    "category": "COMPUTO",          "code_prefix": "MEM",  "is_it_managed": False, "description": "Módulo de memoria RAM",                          "component_type_link": "MEMORIA"},
    {"name": "Otro Cómputo",         "category": "COMPUTO",          "code_prefix": "CPT",  "is_it_managed": False, "description": "Equipo de cómputo no clasificado",               "component_type_link": "OTRO"},

    # ── TELECOMUNICACIONES ───────────────────────────────────────────────────
    {"name": "Switch de red",        "category": "TELECOMUNICACION", "code_prefix": "SWT",  "is_it_managed": True,  "description": "Switch administrado o no administrado",          "component_type_link": "SWITCH"},
    {"name": "Router / Firewall",    "category": "TELECOMUNICACION", "code_prefix": "RTR",  "is_it_managed": True,  "description": "Router, firewall o UTM",                         "component_type_link": None},
    {"name": "Access Point",         "category": "TELECOMUNICACION", "code_prefix": "AP",   "is_it_managed": True,  "description": "Punto de acceso inalámbrico",                    "component_type_link": "ANTENA_WIFI"},
    {"name": "Teléfono IP",          "category": "TELECOMUNICACION", "code_prefix": "TEL",  "is_it_managed": False, "description": "Teléfono VoIP o IP",                             "component_type_link": None},
    {"name": "Videoconferencia",     "category": "TELECOMUNICACION", "code_prefix": "VID",  "is_it_managed": True,  "description": "Equipo de videoconferencia",                     "component_type_link": None},
    {"name": "Patch Panel",          "category": "TELECOMUNICACION", "code_prefix": "PP",   "is_it_managed": False, "description": "Panel de conexiones",                            "component_type_link": "PATCH_PANEL"},
    {"name": "Rack / Gabinete",      "category": "TELECOMUNICACION", "code_prefix": "RCK",  "is_it_managed": False, "description": "Rack de telecomunicaciones",                     "component_type_link": "RACK"},
    {"name": "Otro Telecom",         "category": "TELECOMUNICACION", "code_prefix": "TCM",  "is_it_managed": False, "description": "Equipo de telecomunicaciones no clasificado",    "component_type_link": None},

    # ── MUEBLES Y ENSERES ────────────────────────────────────────────────────
    {"name": "Escritorio",           "category": "MUEBLE",           "code_prefix": "ESC",  "is_it_managed": False, "description": "Escritorio o mesa de trabajo",                   "component_type_link": None},
    {"name": "Silla ejecutiva",      "category": "MUEBLE",           "code_prefix": "SIL",  "is_it_managed": False, "description": "Silla giratoria ejecutiva",                      "component_type_link": None},
    {"name": "Silla de espera",      "category": "MUEBLE",           "code_prefix": "SES",  "is_it_managed": False, "description": "Silla fija para sala de espera",                 "component_type_link": None},
    {"name": "Archivador",           "category": "MUEBLE",           "code_prefix": "ARC",  "is_it_managed": False, "description": "Archivador o gaveta de archivos",                "component_type_link": None},
    {"name": "Estantería",           "category": "MUEBLE",           "code_prefix": "EST",  "is_it_managed": False, "description": "Estante o anaquel",                              "component_type_link": None},
    {"name": "Mesa de reuniones",    "category": "MUEBLE",           "code_prefix": "MRE",  "is_it_managed": False, "description": "Mesa para sala de reuniones",                    "component_type_link": None},
    {"name": "Sofá / Sillón",        "category": "MUEBLE",           "code_prefix": "SOF",  "is_it_managed": False, "description": "Sofá o sillón de sala",                          "component_type_link": None},
    {"name": "Counter / Mostrador",  "category": "MUEBLE",           "code_prefix": "CTR",  "is_it_managed": False, "description": "Counter de atención al cliente",                 "component_type_link": None},
    {"name": "Otro Mueble",          "category": "MUEBLE",           "code_prefix": "MBL",  "is_it_managed": False, "description": "Mueble no clasificado",                          "component_type_link": None},

    # ── INMUEBLES ────────────────────────────────────────────────────────────
    {"name": "Edificio",             "category": "INMUEBLE",         "code_prefix": "EDI",  "is_it_managed": False, "description": "Edificio o construcción",                        "component_type_link": None},
    {"name": "Local comercial",      "category": "INMUEBLE",         "code_prefix": "LOC",  "is_it_managed": False, "description": "Local o punto de atención",                      "component_type_link": None},
    {"name": "Terreno",              "category": "INMUEBLE",         "code_prefix": "TER",  "is_it_managed": False, "description": "Terreno o lote",                                 "component_type_link": None},
    {"name": "Oficina",              "category": "INMUEBLE",         "code_prefix": "OFI",  "is_it_managed": False, "description": "Oficina arrendada o propia",                     "component_type_link": None},
    {"name": "Bodega",               "category": "INMUEBLE",         "code_prefix": "BOD",  "is_it_managed": False, "description": "Bodega o almacén",                               "component_type_link": None},
    {"name": "Otro Inmueble",        "category": "INMUEBLE",         "code_prefix": "INM",  "is_it_managed": False, "description": "Inmueble no clasificado",                        "component_type_link": None},

    # ── VEHÍCULOS ────────────────────────────────────────────────────────────
    {"name": "Automóvil",            "category": "VEHICULO",         "code_prefix": "AUT",  "is_it_managed": False, "description": "Automóvil o sedán",                              "component_type_link": None},
    {"name": "Camioneta",            "category": "VEHICULO",         "code_prefix": "CAM",  "is_it_managed": False, "description": "Camioneta o SUV",                                "component_type_link": None},
    {"name": "Motocicleta",          "category": "VEHICULO",         "code_prefix": "MOT",  "is_it_managed": False, "description": "Motocicleta o scooter",                          "component_type_link": None},
    {"name": "Camión",               "category": "VEHICULO",         "code_prefix": "CMN",  "is_it_managed": False, "description": "Camión de carga",                                "component_type_link": None},
    {"name": "Otro Vehículo",        "category": "VEHICULO",         "code_prefix": "VHC",  "is_it_managed": False, "description": "Vehículo no clasificado",                        "component_type_link": None},

    # ── MAQUINARIA Y EQUIPO ──────────────────────────────────────────────────
    {"name": "Generador eléctrico",  "category": "MAQUINARIA",       "code_prefix": "GEN",  "is_it_managed": False, "description": "Generador o planta eléctrica",                   "component_type_link": None},
    {"name": "Aire acondicionado",   "category": "MAQUINARIA",       "code_prefix": "AC",   "is_it_managed": False, "description": "Sistema de climatización",                       "component_type_link": None},
    {"name": "Ascensor",             "category": "MAQUINARIA",       "code_prefix": "ASC",  "is_it_managed": False, "description": "Ascensor o elevador",                            "component_type_link": None},
    {"name": "Bomba de agua",        "category": "MAQUINARIA",       "code_prefix": "BOM",  "is_it_managed": False, "description": "Sistema de bombeo",                              "component_type_link": None},
    {"name": "Cámara de seguridad",  "category": "MAQUINARIA",       "code_prefix": "CAM",  "is_it_managed": True,  "description": "CCTV o cámara IP de seguridad",                  "component_type_link": "CAMARA"},
    {"name": "Otro Maquinaria",      "category": "MAQUINARIA",       "code_prefix": "MAQ",  "is_it_managed": False, "description": "Maquinaria no clasificada",                      "component_type_link": None},

    # ── OTROS ────────────────────────────────────────────────────────────────
    {"name": "Otro activo",          "category": "OTRO",             "code_prefix": "OTR",  "is_it_managed": False, "description": "Activo que no encaja en otras categorías",       "component_type_link": None},
]


class Command(BaseCommand):
    help = "Siembra los tipos de activo base para todas las categorías LORTI. Idempotente."

    def handle(self, *args, **options):
        created = 0
        updated = 0

        for data in ASSET_TYPES:
            obj, was_created = AssetType.objects.update_or_create(
                name=data["name"],
                defaults={
                    "category":             data["category"],
                    "code_prefix":          data["code_prefix"],
                    "is_it_managed":        data["is_it_managed"],
                    "description":          data["description"],
                    "component_type_link":  data.get("component_type_link"),
                },
            )
            if was_created:
                created += 1
                self.stdout.write(f"  + {obj.name} ({obj.category})")
            else:
                updated += 1
                self.stdout.write(self.style.NOTICE(f"  ~ {obj.name} (ya existía — actualizado)"))

        self.stdout.write(self.style.SUCCESS(
            f"\nListo: {created} tipos creados, {updated} actualizados."
        ))
