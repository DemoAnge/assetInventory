/**
 * Hook que carga los choices de ComponentType, AssetCategory y AssetStatus
 * desde el backend. Reemplaza las constantes quemadas en el frontend.
 * Cacheado 10 minutos — estos valores cambian solo con deploys.
 */
import { useQuery } from "@tanstack/react-query";
import { assetsApi } from "@/api/assetsApi";

export function useAssetChoices() {
  const { data, isLoading } = useQuery({
    queryKey: ["asset-choices"],
    queryFn: () => assetsApi.getChoices().then(r => r.data),
    staleTime: 10 * 60 * 1000,
  });

  return {
    componentTypes:  data?.component_types  ?? [],
    assetCategories: data?.asset_categories ?? [],
    assetStatuses:   data?.asset_statuses   ?? [],
    isLoading,
  };
}
