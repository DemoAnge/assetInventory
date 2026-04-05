from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.shared.permissions import IsAnyStaff
from .models import AssetDocument
from .serializers import AssetDocumentSerializer


class AssetDocumentViewSet(viewsets.ModelViewSet):
    """CRUD de documentos adjuntos a activos."""
    permission_classes = [IsAuthenticated, IsAnyStaff]
    parser_classes     = [MultiPartParser, FormParser]
    serializer_class   = AssetDocumentSerializer
    filterset_fields   = ["asset", "document_type"]
    search_fields      = ["title", "asset__asset_code", "notes"]
    ordering           = ["-created_at"]

    def get_queryset(self):
        return AssetDocument.objects.select_related("asset", "uploaded_by").all()

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user, created_by=self.request.user)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    @action(detail=False, methods=["get"], url_path="by-asset")
    def by_asset(self, request):
        """GET /documents/by-asset/?asset_id=<id>"""
        asset_id = request.query_params.get("asset_id")
        if not asset_id:
            return Response({"detail": "asset_id requerido."}, status=status.HTTP_400_BAD_REQUEST)
        qs = self.get_queryset().filter(asset_id=asset_id)
        return Response(AssetDocumentSerializer(qs, many=True, context={"request": request}).data)
