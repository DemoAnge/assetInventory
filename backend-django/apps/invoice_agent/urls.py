from django.urls import path
from .views import InvoiceExtractView

urlpatterns = [
    path("extract/", InvoiceExtractView.as_view(), name="invoice-extract"),
]
