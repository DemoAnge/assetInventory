import axiosClient from "./axiosClient";
import type { LoginRequestType, LoginResponseType } from "@/@types/auth.types";

export const authApi = {
  login: (data: LoginRequestType) =>
    axiosClient.post<LoginResponseType>("/auth/login/", data),

  refreshToken: (refresh: string) =>
    axiosClient.post<{ access: string }>("/auth/token/refresh/", { refresh }),

  logout: (refresh: string) =>
    axiosClient.post("/auth/logout/", { refresh }),

  getMe: () =>
    axiosClient.get("/auth/users/me/"),

  changePassword: (data: { old_password: string; new_password: string; confirm_new_password: string }) =>
    axiosClient.post("/auth/users/change_password/", data),
};
