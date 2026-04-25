from rest_framework import serializers
from .models import ITAssetProfile, SoftwareLicense


class ITAssetProfileReadSerializer(serializers.ModelSerializer):
    asset_code          = serializers.CharField(source="asset.asset_code", read_only=True)
    asset_name          = serializers.CharField(source="asset.name", read_only=True)
    asset_serial_number = serializers.CharField(source="asset.serial_number", read_only=True, default=None)
    asset_status        = serializers.CharField(source="asset.status", read_only=True)
    asset_is_active     = serializers.BooleanField(source="asset.is_active", read_only=True)
    risk_level_display  = serializers.CharField(source="get_risk_level_display", read_only=True)
    software_count      = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ITAssetProfile
        fields = [
            "id", "asset", "asset_code", "asset_name", "asset_serial_number",
            "asset_status", "asset_is_active",
            "hostname", "ip_address", "mac_address",
            "os_name", "os_version", "processor", "ram_gb", "storage_gb",
            "risk_level", "risk_level_display",
            "is_server", "is_network_device",
            "last_scan_date", "antivirus", "notes",
            "software_count",
        ]

    def get_software_count(self, obj):
        return obj.asset.licenses.count()


class ITAssetProfileWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ITAssetProfile
        fields = [
            "asset", "hostname", "ip_address", "mac_address",
            "os_name", "os_version", "processor", "ram_gb", "storage_gb",
            "risk_level", "is_server", "is_network_device",
            "last_scan_date", "antivirus", "notes",
        ]


class SoftwareLicenseReadSerializer(serializers.ModelSerializer):
    license_type_display = serializers.CharField(source="get_license_type_display", read_only=True)
    available_seats      = serializers.IntegerField(read_only=True)
    is_expired           = serializers.BooleanField(read_only=True)
    asset_codes          = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = SoftwareLicense
        fields = [
            "id", "software_name", "version", "license_key",
            "license_type", "license_type_display",
            "seats", "used_seats", "available_seats",
            "vendor", "purchase_date", "expiry_date", "cost",
            "assets", "asset_codes", "is_expired", "notes",
        ]

    def get_asset_codes(self, obj):
        return list(obj.assets.values_list("asset_code", flat=True))


class SoftwareLicenseWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = SoftwareLicense
        fields = [
            "software_name", "version", "license_key", "license_type",
            "seats", "used_seats", "vendor",
            "purchase_date", "expiry_date", "cost", "assets", "notes",
        ]
