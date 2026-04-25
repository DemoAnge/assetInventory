import axiosClient from "./axiosClient";
import type { UserProfileType, SystemInfoType } from "@/@types/settings.types";

export const settingsApi = {
  getProfile: () =>
    axiosClient.get<UserProfileType>("/settings/profile/"),

  updateProfile: (data: Partial<UserProfileType>) =>
    axiosClient.patch<UserProfileType>("/settings/profile/", data),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append("avatar", file);
    return axiosClient.post<{ avatar_url: string }>("/settings/avatar/", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  deleteAvatar: () =>
    axiosClient.delete<{ detail: string }>("/settings/avatar/"),

  uploadBackground: (file: File) => {
    const form = new FormData();
    form.append("background", file);
    return axiosClient.post<{ background_url: string }>("/settings/background/", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  deleteBackground: () =>
    axiosClient.delete<{ detail: string }>("/settings/background/"),

  changePassword: (data: { old_password: string; new_password: string; confirm_new_password: string }) =>
    axiosClient.post<{ detail: string }>("/settings/change-password/", data),

  getSystemInfo: () =>
    axiosClient.get<SystemInfoType>("/settings/system/"),
};
