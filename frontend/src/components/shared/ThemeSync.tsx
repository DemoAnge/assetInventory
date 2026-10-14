import { useEffect, useRef } from "react";
import { settingsApi } from "@/api/settingsApi";
import { useAuthStore } from "@/store/authStore";
import { readStoredTheme, useThemeStore } from "@/store/themeStore";

export function ThemeSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const hydratedFromProfile = useRef(false);
  const skipNextPersist = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      hydratedFromProfile.current = false;
      return;
    }
    if (hydratedFromProfile.current) return;
    if (readStoredTheme()) {
      hydratedFromProfile.current = true;
      return;
    }
    let cancelled = false;
    settingsApi
      .getProfile()
      .then((res) => {
        if (cancelled) return;
        hydratedFromProfile.current = true;
        if (res.data.theme === "light" || res.data.theme === "dark") {
          skipNextPersist.current = true;
          setTheme(res.data.theme);
        }
      })
      .catch(() => {
        hydratedFromProfile.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, setTheme]);

  useEffect(() => {
    if (!isAuthenticated || !hydratedFromProfile.current) return;
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    settingsApi.updateProfile({ theme }).catch(() => {
      // el tema local ya está aplicado
    });
  }, [theme, isAuthenticated]);

  return null;
}
