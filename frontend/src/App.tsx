import { Suspense } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { ThemeSync } from "@/components/shared/ThemeSync";
import AppRouter from "@/routes/AppRouter";

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
    </div>
  );
}

export default function App() {
  useWebSocket();

  return (
    <>
      <ThemeSync />
      <Suspense fallback={<PageLoader />}>
        <AppRouter />
      </Suspense>
    </>
  );
}
