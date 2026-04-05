from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MaintenanceViewSet

router = DefaultRouter()
router.register("", MaintenanceViewSet, basename="maintenance")
urlpatterns = [path("", include(router.urls))]
