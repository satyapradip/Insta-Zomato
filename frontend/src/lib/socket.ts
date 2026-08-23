import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;

    socket = io(SOCKET_URL, {
      autoConnect: true,
      withCredentials: true,
      auth: {
        token: token ? `Bearer ${token}` : undefined,
      },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("[Socket.io] Connected successfully:", socket?.id);
    });

    socket.on("connect_error", (err) => {
      console.warn("[Socket.io] Connection error:", err.message);
    });
  }

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
