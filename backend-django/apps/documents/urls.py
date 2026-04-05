from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AssetDocumentViewSet

router = DefaultRouter()
router.register("", AssetDocumentViewSet, basename="document")

urlpatterns = [path("", include(router.urls))]
