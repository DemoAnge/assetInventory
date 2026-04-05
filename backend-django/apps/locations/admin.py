from django.contrib import admin
from .models import Agency, Department, Area


class DepartmentInline(admin.TabularInline):
    model = Department
    extra = 0
    show_change_link = True


class AreaInline(admin.TabularInline):
    model = Area
    extra = 0


@admin.register(Agency)
class AgencyAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "city", "province", "is_main", "is_active"]
    list_filter = ["is_main", "is_active", "province"]
    search_fields = ["code", "name", "city"]
    inlines = [DepartmentInline]


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "agency", "is_active"]
    list_filter = ["agency", "is_active"]
    search_fields = ["code", "name"]
    inlines = [AreaInline]


@admin.register(Area)
class AreaAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "department", "floor", "is_active"]
    list_filter = ["department__agency", "is_active"]
    search_fields = ["code", "name"]
