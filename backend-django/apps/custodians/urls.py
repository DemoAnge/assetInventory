from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustodianViewSet

router = DefaultRouter()
router.register(r"", CustodianViewSet, basename="custodian")

urlpatterns = [path("", include(router.urls))]
