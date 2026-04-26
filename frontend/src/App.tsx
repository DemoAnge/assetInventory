import { Suspense } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import AppRouter from "@/routes/AppRouter";

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
    </div>
  );
}

export default function App() {
  useWebSocket();

  return (
    <Suspense fallback={<PageLoader />}>
      <AppRouter />
    </Suspense>
  );
}
