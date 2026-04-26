"""
Agente OCR con Claude AI — extrae datos de facturas/documentos para pre-llenar activos.
POST /api/v1/invoice-agent/extract/ — envía imagen/PDF, devuelve JSON estructurado.
POST /api/v1/invoice-agent/create-asset/ — crea activo directamente desde datos extraídos.
"""
import base64
import json

from django.conf import settings
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.shared.permissions import IsAnyStaff


EXTRACT_SYSTEM_PROMPT = """Eres un asistente especializado en extraer información de facturas y documentos de compra de activos fijos para una cooperativa ecuatoriana.

Analiza la imagen/documento proporcionado y extrae SOLO la información que puedas ver claramente.
Si un campo no está visible, devuelve null para ese campo.

Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta (sin explicaciones ni texto adicional):
{
  "asset_name": "nombre descriptivo del activo",
  "brand": "marca del equipo",
  "model": "modelo del equipo",
  "serial_number": "número de serie",
  "category": "COMPUTO|VEHICULO|MAQUINARIA|MUEBLE|INMUEBLE|TELECOMUNICACION|OTRO",
  "supplier": "nombre del proveedor/vendedor",
  "invoice_number": "número de factura",
  "purchase_date": "YYYY-MM-DD o null",
  "purchase_value": número_decimal_o_null,
  "warranty_months": número_entero_o_null,
  "notes": "observaciones adicionales relevantes",
  "confidence": "HIGH|MEDIUM|LOW",
  "raw_text_extracted": "texto relevante que encontraste en el documento"
}

Categorías válidas:
- COMPUTO: laptops, PCs, tablets, servidores, monitores, impresoras
- VEHICULO: autos, motos, camiones
- MAQUINARIA: equipos industriales, generadores, aires acondicionados
- MUEBLE: escritorios, sillas, archivadores
- INMUEBLE: edificios, terrenos
- TELECOMUNICACION: routers, switches, centrales telefónicas, cámaras IP
- OTRO: cualquier otro activo fijo"""


class InvoiceExtractView(APIView):
    """POST /api/v1/invoice-agent/extract/ — OCR con Claude AI."""
    permission_classes = [IsAuthenticated, IsAnyStaff]
    parser_classes     = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "Se requiere un archivo (imagen o PDF)."}, status=status.HTTP_400_BAD_REQUEST)

        # Validar tipo
        allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"]
        if file.content_type not in allowed:
            return Response(
                {"detail": f"Tipo de archivo no soportado: {file.content_type}. Use JPG, PNG, GIF, WEBP o PDF."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        api_key = getattr(settings, "ANTHROPIC_API_KEY", None)
        if not api_key:
            return Response({"detail": "ANTHROPIC_API_KEY no configurada en el servidor."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)

            file_data = file.read()
            b64_data  = base64.standard_b64encode(file_data).decode("utf-8")
            media_type = file.content_type

            # Claude no soporta PDF directamente en messages — si es PDF, notificar
            if media_type == "application/pdf":
                return Response({
                    "detail": "PDF recibido. Por ahora solo se procesan imágenes (JPG, PNG). Convierta la factura a imagen e inténtelo de nuevo.",
                    "suggestion": "Tome una captura de pantalla o escanee la factura como imagen."
                }, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

            message = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=1024,
                system=EXTRACT_SYSTEM_PROMPT,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": b64_data,
                            },
                        },
                        {
                            "type": "text",
                            "text": "Extrae todos los datos de este documento de compra de activo fijo.",
                        },
                    ],
                }],
            )

            raw_response = message.content[0].text.strip()

            # Intentar parsear el JSON de la respuesta
            try:
                # Limpiar markdown si Claude lo incluye
                clean = raw_response
                if "```json" in clean:
                    clean = clean.split("```json")[1].split("```")[0].strip()
                elif "```" in clean:
                    clean = clean.split("```")[1].split("```")[0].strip()

                extracted = json.loads(clean)
            except json.JSONDecodeError:
                extracted = {"raw_text_extracted": raw_response, "confidence": "LOW"}

            return Response({
                "success": True,
                "extracted": extracted,
                "model_used": "claude-haiku-4-5-20251001",
                "tokens_used": message.usage.input_tokens + message.usage.output_tokens,
            })

        except Exception as e:
            return Response(
                {"detail": f"Error al procesar con Claude AI: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
