from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .catalog_views import AccountCodeViewSet, AssetModelViewSet, AssetTypeViewSet, BrandViewSet
from .views import AssetViewSet

router = DefaultRouter()
router.register(r"brands",         BrandViewSet,       basename="brand")
router.register(r"asset-types",    AssetTypeViewSet,   basename="asset-type")
router.register(r"asset-models",   AssetModelViewSet,  basename="asset-model")
router.register(r"account-codes",  AccountCodeViewSet, basename="account-code")
router.register(r"",               AssetViewSet,       basename="asset")

urlpatterns = [path("", include(router.urls))]
