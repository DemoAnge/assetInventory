from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AgencyViewSet, DepartmentViewSet, AreaViewSet

router = DefaultRouter()
router.register("agencies", AgencyViewSet, basename="agency")
router.register("departments", DepartmentViewSet, basename="department")
router.register("areas", AreaViewSet, basename="area")

urlpatterns = [path("", include(router.urls))]
