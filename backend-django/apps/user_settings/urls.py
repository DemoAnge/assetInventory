from django.urls import path
from .views import (
    ProfileView,
    AvatarUploadView,
    BackgroundUploadView,
    ChangePasswordView,
    SystemInfoView,
)

urlpatterns = [
    path("profile/",         ProfileView.as_view(),          name="settings-profile"),
    path("avatar/",          AvatarUploadView.as_view(),     name="settings-avatar"),
    path("background/",      BackgroundUploadView.as_view(), name="settings-background"),
    path("change-password/", ChangePasswordView.as_view(),   name="settings-password"),
    path("system/",          SystemInfoView.as_view(),        name="settings-system"),
]
