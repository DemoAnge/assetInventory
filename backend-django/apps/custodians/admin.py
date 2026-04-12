from django.contrib import admin
from .models import Custodian


@admin.register(Custodian)
class CustodianAdmin(admin.ModelAdmin):
    list_display   = ["id", "full_name", "id_number", "position", "is_active", "created_at"]
    list_filter    = ["is_active"]
    search_fields  = ["first_name", "last_name", "id_number", "position"]
    ordering       = ["last_name", "first_name"]
    readonly_fields = ["created_at", "updated_at", "created_by", "updated_by"]

    def has_delete_permission(self, request, obj=None):
        return False
