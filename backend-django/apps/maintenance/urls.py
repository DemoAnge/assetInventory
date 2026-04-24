from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MaintenanceViewSet, TechnicianViewSet

router = DefaultRouter()
router.register("technicians", TechnicianViewSet, basename="technician")
router.register("", MaintenanceViewSet, basename="maintenance")

urlpatterns = [path("", include(router.urls))]
