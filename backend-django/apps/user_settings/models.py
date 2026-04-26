from django.db import models
from django.core.validators import FileExtensionValidator


def avatar_path(instance, filename):
    return f"avatars/user_{instance.user_id}/{filename}"


def background_path(instance, filename):
    return f"backgrounds/user_{instance.user_id}/{filename}"


class UserProfile(models.Model):
    THEME_CHOICES = [("light", "Claro"), ("dark", "Oscuro")]

    user = models.OneToOneField(
        "users.CustomUser",
        on_delete=models.CASCADE,
        related_name="profile",
        verbose_name="Usuario",
    )
    avatar = models.ImageField(
        upload_to=avatar_path,
        null=True, blank=True,
        validators=[FileExtensionValidator(["jpg", "jpeg", "png", "webp"])],
        verbose_name="Avatar",
    )
    background = models.ImageField(
        upload_to=background_path,
        null=True, blank=True,
        validators=[FileExtensionValidator(["jpg", "jpeg", "png", "webp"])],
        verbose_name="Imagen de fondo",
    )
    theme = models.CharField(
        max_length=5,
        choices=THEME_CHOICES,
        default="light",
        verbose_name="Tema",
    )
    bio = models.TextField(blank=True, verbose_name="Biografía")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Perfil de usuario"
        verbose_name_plural = "Perfiles de usuario"

    def __str__(self):
        return f"Perfil — {self.user.get_full_name()}"
