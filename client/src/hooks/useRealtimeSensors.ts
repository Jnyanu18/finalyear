import { useEffect, useRef, useState } from "react";

import { toWebSocketUrl } from "@/lib/api-base";
import { useAuthStore } from "@/store/authStore";
import type { AlertItem, SensorReadingsResponse } from "@/types/agrosense";

interface RealtimePayload {
  sensors: SensorReadingsResponse | null;
  alerts: AlertItem[];
  status: "connecting" | "connected" | "reconnecting" | "closed";
}

type SocketMessage =
  | { type: "sensor_snapshot"; data: SensorReadingsResponse }
  | { type: "alert"; alert: AlertItem }
  | { type: string; data?: SensorReadingsResponse };

export function useRealtimeSensors(fieldId: string) {
  const [payload, setPayload] = useState<RealtimePayload>({
    sensors: null,
    alerts: [],
    status: "closed",
  });
  const reconnectRef = useRef<number | null>(null);

  useEffect(() => {
    if (!fieldId) {
      return undefined;
    }

    const socketTarget = toWebSocketUrl(`/ws/sensors/${fieldId}`);

    if (!socketTarget) {
      return undefined;
    }

    const token = useAuthStore.getState().token;
    const socketUrl = new URL(socketTarget);

    if (token) {
      socketUrl.searchParams.set("token", token);
    }

    let ws: WebSocket | null = null;
    let disposed = false;

    const connect = () => {
      if (disposed) {
        return;
      }

      setPayload((current) => ({
        ...current,
        status: current.status === "connected" ? "reconnecting" : "connecting",
      }));

      ws = new WebSocket(socketUrl.toString());

      ws.onopen = () => {
        setPayload((current) => ({ ...current, status: "connected" }));
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data) as SocketMessage;

        if (message.type === "sensor_snapshot" && "data" in message) {
          setPayload((current) => ({ ...current, sensors: message.data ?? null }));
        }

        if (message.type === "alert" && "alert" in message) {
          setPayload((current) => ({
            ...current,
            alerts: [message.alert, ...current.alerts].slice(0, 20),
          }));
        }
      };

      ws.onclose = () => {
        if (disposed) {
          return;
        }

        setPayload((current) => ({ ...current, status: "closed" }));
        reconnectRef.current = window.setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      disposed = true;

      if (reconnectRef.current) {
        window.clearTimeout(reconnectRef.current);
      }

      ws?.close();
    };
  }, [fieldId]);

  return payload;
}
