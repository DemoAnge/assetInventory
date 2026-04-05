import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthStateType, UserType } from "@/types/auth.types";

export const useAuthStore = create<AuthStateType>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      mfaVerified: false,
      isAuthenticated: false,

      setAuth: (user: UserType, access: string, refresh: string, mfaVerified = false) =>
        set({
          user,
          accessToken: access,
          refreshToken: refresh,
          mfaVerified,
          isAuthenticated: true,
        }),

      setMfaVerified: (verified: boolean) => set({ mfaVerified: verified }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          mfaVerified: false,
          isAuthenticated: false,
        }),
    }),
    {
      name: "inventario-auth",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
