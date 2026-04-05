from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ITAssetProfileViewSet, SoftwareLicenseViewSet

router = DefaultRouter()
router.register("profiles", ITAssetProfileViewSet, basename="it-profile")
router.register("licenses", SoftwareLicenseViewSet, basename="license")
urlpatterns = [path("", include(router.urls))]
