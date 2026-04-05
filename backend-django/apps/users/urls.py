from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView

from .views import LoginView, MfaLoginView, UserViewSet, MfaViewSet

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")
router.register("mfa", MfaViewSet, basename="mfa")

urlpatterns = [
    # Login en dos fases
    path("login/", LoginView.as_view(), name="login"),
    path("login/mfa/", MfaLoginView.as_view(), name="login-mfa"),

    # JWT refresh y logout (blacklist)
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("logout/", TokenBlacklistView.as_view(), name="logout"),

    # CRUD usuarios + MFA actions
    path("", include(router.urls)),
]
