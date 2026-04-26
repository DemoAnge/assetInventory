from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.audit.models import AuditLog
from apps.shared.permissions import IsAdmin, IsAdminOrReadOnly
from apps.shared.utils import get_client_ip
from .models import Agency, Department, Area
from .serializers import (
    AgencyReadSerializer, AgencyWriteSerializer,
    DepartmentReadSerializer, DepartmentWriteSerializer,
    AreaReadSerializer, AreaWriteSerializer,
)


class AgencyViewSet(viewsets.ModelViewSet):
    queryset = Agency.objects.prefetch_related("departments__areas").all()
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filterset_fields = ["is_active", "is_main", "city", "province"]
    search_fields = ["code", "name", "city"]
    ordering_fields = ["name", "code"]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return AgencyWriteSerializer
        return AgencyReadSerializer

    def _audit(self, action, instance):
        AuditLog.objects.create(
            user=self.request.user, action=action, model="Agency",
            object_id=instance.pk, object_code=instance.code,
            object_name=instance.name, module="locations",
            ip_address=get_client_ip(self.request),
        )

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        self._audit("CREATE", instance)

    def perform_update(self, serializer):
        instance = serializer.save(updated_by=self.request.user)
        self._audit("UPDATE", instance)


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.select_related("agency").prefetch_related("areas").all()
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filterset_fields = ["agency", "is_active"]
    search_fields = ["code", "name"]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return DepartmentWriteSerializer
        return DepartmentReadSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class AreaViewSet(viewsets.ModelViewSet):
    queryset = Area.objects.select_related("department__agency").all()
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filterset_fields = ["department", "is_active"]
    search_fields = ["code", "name"]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return AreaWriteSerializer
        return AreaReadSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
