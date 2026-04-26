from django.contrib import admin
from .models import Custodian


@admin.register(Custodian)
class CustodianAdmin(admin.ModelAdmin):
    list_display    = ["id", "full_name", "id_number", "position", "agency", "is_active", "created_at"]
    list_filter     = ["is_active", "agency"]
    search_fields   = ["first_name", "last_name", "id_number", "position", "agency__name"]
    ordering        = ["last_name", "first_name"]
    readonly_fields = ["created_at", "updated_at", "created_by", "updated_by"]
    autocomplete_fields = ["agency"]
    fieldsets = (
        ("Información personal", {
            "fields": ("first_name", "last_name", "id_number", "phone", "position"),
        }),
        ("Organización", {
            "fields": ("agency", "is_active"),
        }),
        ("Auditoría", {
            "fields": ("created_at", "updated_at", "created_by", "updated_by"),
            "classes": ("collapse",),
        }),
    )

    def has_delete_permission(self, request, obj=None):
        return False
