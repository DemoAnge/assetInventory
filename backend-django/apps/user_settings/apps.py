from django.apps import AppConfig


class UserSettingsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.user_settings"
    verbose_name = "Ajustes de usuario"

    def ready(self):
        import apps.user_settings.signals  # noqa: F401
