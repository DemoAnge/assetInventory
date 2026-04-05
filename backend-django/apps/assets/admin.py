from django.contrib import admin
from .models import Asset

class ComponentInline(admin.TabularInline):
    model = Asset
    fk_name = "parent_asset"
    extra = 0
    fields = ["asset_code", "name", "component_type", "serial_number", "status"]
    show_change_link = True

@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ["asset_code", "name", "category", "status", "agency", "custodian", "is_active", "purchase_value"]
    list_filter  = ["category", "status", "is_active", "is_critical_it", "agency"]
    search_fields = ["asset_code", "name", "serial_number", "brand", "invoice_number"]
    readonly_fields = ["qr_uuid", "created_at", "updated_at", "created_by"]
    inlines = [ComponentInline]
    fieldsets = (
        ("Identificación", {"fields": ("asset_code", "serial_number", "name", "brand", "model_name", "color")}),
        ("Clasificación", {"fields": ("category", "status", "component_type", "parent_asset")}),
        ("Ubicación", {"fields": ("agency", "department", "area", "custodian")}),
        ("Finanzas (cifrado)", {"fields": ("purchase_value", "residual_value", "current_value", "accumulated_depreciation")}),
        ("Fechas", {"fields": ("purchase_date", "activation_date", "deactivation_date", "warranty_expiry")}),
        ("Depreciación LORTI", {"fields": ("useful_life_years", "depreciation_rate", "is_fully_depreciated")}),
        ("Factura", {"fields": ("invoice_number", "supplier", "invoice_image")}),
        ("SEPS / QR", {"fields": ("seps_account_code", "qr_uuid")}),
        ("Flags", {"fields": ("is_active", "is_critical_it", "requires_maintenance")}),
    )
