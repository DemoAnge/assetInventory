import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthStateType, UserType } from "@/@types/auth.types";

export const useAuthStore = create<AuthStateType>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user: UserType, access: string, refresh: string) =>
        set({
          user,
          accessToken: access,
          refreshToken: refresh,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "inventario-auth",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
