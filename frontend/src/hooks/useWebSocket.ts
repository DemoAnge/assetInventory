import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";

const NODE_URL = import.meta.env.VITE_NODE_URL || "http://localhost:4000";

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { accessToken, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const socket = io(NODE_URL, {
      auth: { token: accessToken },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 3000,
    });

    socket.on("connect", () => {
      console.info("[WebSocket] Conectado al servidor de notificaciones.");
    });

    socket.on("notification", (data: { title: string; message: string; type: string }) => {
      const { title, message, type } = data;
      const text = `${title}: ${message}`;
      if (type === "error") toast.error(text);
      else if (type === "warning") toast(text, { icon: "⚠️" });
      else if (type === "success") toast.success(text);
      else toast(text);
    });

    socket.on("disconnect", () => {
      console.info("[WebSocket] Desconectado.");
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [isAuthenticated, accessToken]);

  return socketRef.current;
}
