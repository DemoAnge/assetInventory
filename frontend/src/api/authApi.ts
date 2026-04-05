import axiosClient from "./axiosClient";
import type { LoginRequestType, LoginResponseType, MfaLoginRequestType } from "@/types/auth.types";

export const authApi = {
  login: (data: LoginRequestType) =>
    axiosClient.post<LoginResponseType>("/auth/login/", data),

  loginMfa: (data: MfaLoginRequestType) =>
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
    axiosClient.post("/auth/mfa/setup/"),

  mfaConfirm: (token: string) =>
    axiosClient.post("/auth/mfa/confirm/", { token }),

  mfaDisable: (data: { token: string; password: string }) =>
    axiosClient.post("/auth/mfa/disable/", data),
};
