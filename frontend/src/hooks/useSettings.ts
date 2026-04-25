import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { settingsApi } from "@/api/settingsApi";

const PROFILE_KEY = ["settings", "profile"] as const;
const SYSTEM_KEY  = ["settings", "system"]  as const;

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn:  () => settingsApi.getProfile().then(r => r.data),
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof settingsApi.updateProfile>[0]) =>
      settingsApi.updateProfile(data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROFILE_KEY });
      toast.success("Perfil actualizado correctamente.");
    },
    onError: () => toast.error("Error al actualizar el perfil."),
  });
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => settingsApi.uploadAvatar(file).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROFILE_KEY });
      toast.success("Avatar actualizado.");
    },
    onError: () => toast.error("Error al subir el avatar."),
  });
}

export function useDeleteAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => settingsApi.deleteAvatar(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROFILE_KEY });
      toast.success("Avatar eliminado.");
    },
  });
}

export function useUploadBackground() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => settingsApi.uploadBackground(file).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROFILE_KEY });
      toast.success("Imagen de fondo actualizada.");
    },
    onError: () => toast.error("Error al subir la imagen de fondo."),
  });
}

export function useDeleteBackground() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => settingsApi.deleteBackground(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROFILE_KEY });
      toast.success("Imagen de fondo eliminada.");
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: settingsApi.changePassword,
    onSuccess: () => toast.success("Contraseña actualizada correctamente."),
    onError: (err: any) => {
      const msg = err?.response?.data?.old_password
        ?? err?.response?.data?.new_password?.[0]
        ?? "Error al cambiar la contraseña.";
      toast.error(msg);
    },
  });
}

export function useSystemInfo() {
  return useQuery({
    queryKey: SYSTEM_KEY,
    queryFn:  () => settingsApi.getSystemInfo().then(r => r.data),
    staleTime: Infinity,
  });
}
