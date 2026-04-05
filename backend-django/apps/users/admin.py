from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, LoginAttempt


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ["email", "get_full_name", "role", "is_active", "mfa_enabled", "date_joined"]
    list_filter = ["role", "is_active", "mfa_enabled"]
    search_fields = ["email", "first_name", "last_name", "cedula"]
    ordering = ["email"]
    readonly_fields = ["date_joined", "last_login", "last_login_ip"]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Información personal", {"fields": ("first_name", "last_name", "cedula", "phone")}),
        ("Rol y agencia", {"fields": ("role", "agency")}),
        ("MFA", {"fields": ("mfa_enabled", "mfa_secret")}),
        ("Estado", {"fields": ("is_active", "is_staff", "is_superuser")}),
        ("Auditoría", {"fields": ("date_joined", "last_login", "last_login_ip")}),
    )
    add_fieldsets = (
        (None, {"fields": ("email", "password1", "password2", "role", "first_name", "last_name")}),
    )


@admin.register(LoginAttempt)
class LoginAttemptAdmin(admin.ModelAdmin):
    list_display = ["email", "ip_address", "success", "attempted_at"]
    list_filter = ["success"]
    search_fields = ["email", "ip_address"]
    readonly_fields = ["email", "ip_address", "success", "attempted_at", "user_agent"]
