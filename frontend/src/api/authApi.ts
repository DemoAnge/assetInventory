import axiosClient from "./axiosClient";
import type { LoginRequestType, LoginResponseType } from "@/@types/auth.types";

export const authApi = {
  login: (data: LoginRequestType) =>
    axiosClient.post<LoginResponseType>("/auth/login/", data),

  loginMfa: (data: { temp_token: string; totp_code: string }) =>
    axiosClient.post<LoginResponseType>("/auth/login/mfa/", data),

  refreshToken: (refresh: string) =>
    axiosClient.post<{ access: string }>("/auth/token/refresh/", { refresh }),

  logout: (refresh: string) =>
    axiosClient.post("/auth/logout/", { refresh }),

  getMe: () =>
    axiosClient.get("/auth/users/me/"),

  changePassword: (data: { old_password: string; new_password: string; confirm_new_password: string }) =>
    axiosClient.post("/auth/users/change_password/", data),

  mfaSetup: () =>
    axiosClient.post<{ secret: string; provisioning_uri: string; qr_code_base64: string }>(
      "/auth/users/mfa_setup/"
    ),

  mfaConfirm: (token: string) =>
    axiosClient.post<{ detail: string; mfa_enabled: boolean }>("/auth/users/mfa_confirm/", { token }),

  mfaDisable: (data: { token: string; password: string }) =>
    axiosClient.post<{ detail: string; mfa_enabled: boolean }>("/auth/users/mfa_disable/", data),
};
