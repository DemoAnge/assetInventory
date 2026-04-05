from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AssetMovementViewSet

router = DefaultRouter()
router.register("", AssetMovementViewSet, basename="movement")

urlpatterns = [path("", include(router.urls))]
