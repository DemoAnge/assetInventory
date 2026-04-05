from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DepreciationViewSet, AssetSaleViewSet

router = DefaultRouter()
router.register("depreciation", DepreciationViewSet, basename="depreciation")
router.register("sales", AssetSaleViewSet, basename="asset-sale")

urlpatterns = [path("", include(router.urls))]
