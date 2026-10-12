import { useQuery } from "@tanstack/react-query";
import { itApi } from "@/api/itApi";
import { assetsApi } from "@/api/assetsApi";

export const IT_KEYS = {
  profiles: ["it-profiles"] as const,
  assets: ["it-assets-list"] as const,
  licenses: ["it-license"] as const,
};

export function useITAssets(params: {
  category: string;
  search?: string;
  page: number;
  enabled?: boolean;
}) {
  const { category, search, page, enabled = true } = params;
  return useQuery({
    queryKey: [...IT_KEYS.assets, category, search, page],
    queryFn: () =>
      assetsApi.getAll({ category, search: search || undefined, page }).then((r) => r.data),
    enabled,
  });
}

export function useITProfiles(params: Record<string, unknown>, enabled = true) {
  return useQuery({
    queryKey: [...IT_KEYS.profiles, "all", params],
    queryFn: () => itApi.getAllProfiles(params).then((r) => r.data),
    enabled,
  });
}
