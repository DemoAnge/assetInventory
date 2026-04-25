from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.audit.models import AuditLog, AuditAction
from apps.shared.permissions import IsAnyStaff
from apps.shared.utils import get_client_ip
from .models import AssetDocument
from .serializers import AssetDocumentSerializer


class AssetDocumentViewSet(viewsets.ModelViewSet):
    """CRUD de documentos adjuntos a activos con trazabilidad en audit log."""
    permission_classes = [IsAuthenticated, IsAnyStaff]
    parser_classes     = [MultiPartParser, FormParser, JSONParser]
    serializer_class   = AssetDocumentSerializer
    filterset_fields   = ["asset", "document_type"]
    search_fields      = ["title", "asset__asset_code", "asset__name", "asset__serial_number", "notes"]
    ordering           = ["-created_at"]

    def get_queryset(self):
        return AssetDocument.objects.select_related(
            "asset", "uploaded_by", "updated_by"
        ).all()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def perform_create(self, serializer):
        doc = serializer.save(
            uploaded_by=self.request.user,
            created_by=self.request.user,
        )
        AuditLog.objects.create(
            user=self.request.user,
            action=AuditAction.DOCUMENT_GENERATED,
            model="AssetDocument",
            object_id=doc.pk,
            object_code=doc.asset.asset_code,
            object_name=doc.title,
            module="documents",
            ip_address=get_client_ip(self.request),
            extra_data={
                "document_type": doc.document_type,
                "file_size_kb": round(doc.file_size / 1024, 1) if doc.file_size else 0,
            },
        )

    def perform_update(self, serializer):
        old = self.get_object()
        # Capturar estado previo antes del save
        snap = {
            "title":         old.title,
            "document_type": old.document_type,
            "notes":         old.notes,
            "file":          old.file.name if old.file else "",
        }

        doc = serializer.save(updated_by=self.request.user)

        # Detectar campos modificados
        changed = {}
        if doc.title != snap["title"]:
            changed["title"] = {"de": snap["title"], "a": doc.title}
        if doc.document_type != snap["document_type"]:
            changed["document_type"] = {"de": snap["document_type"], "a": doc.document_type}
        if doc.notes != snap["notes"]:
            changed["notes"] = {"de": snap["notes"], "a": doc.notes}
        file_now = doc.file.name if doc.file else ""
        if file_now != snap["file"]:
            changed["file"] = {"de": snap["file"], "a": file_now}

        AuditLog.objects.create(
            user=self.request.user,
            action=AuditAction.UPDATE,
            model="AssetDocument",
            object_id=doc.pk,
            object_code=doc.asset.asset_code,
            object_name=doc.title,
            module="documents",
            ip_address=get_client_ip(self.request),
            changed_fields=changed or None,
        )

    def perform_destroy(self, instance):
        AuditLog.objects.create(
            user=self.request.user,
            action=AuditAction.DELETE,
            model="AssetDocument",
            object_id=instance.pk,
            object_code=instance.asset.asset_code,
            object_name=instance.title,
            module="documents",
            ip_address=get_client_ip(self.request),
            extra_data={"document_type": instance.document_type},
        )
        instance.delete()

    @action(detail=False, methods=["get"], url_path="by-asset")
    def by_asset(self, request):
        """GET /documents/by-asset/?asset_id=<id>"""
        asset_id = request.query_params.get("asset_id")
        if not asset_id:
            return Response({"detail": "asset_id requerido."}, status=status.HTTP_400_BAD_REQUEST)
        qs = self.get_queryset().filter(asset_id=asset_id)
        return Response(
            AssetDocumentSerializer(qs, many=True, context={"request": request}).data
        )
