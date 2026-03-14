import { WebSocketServer } from "ws";
import { getLatestSensorReadings } from "../services/agrosense/fieldService.js";
import { logger } from "../services/agrosense/logger.js";

const clients = new Map();

function parseFieldId(url) {
  const match = url.match(/^\/ws\/sensors\/([^/?]+)/);
  return match ? match[1] : null;
}

async function sendSensorSnapshot(ws, fieldId) {
  try {
    const payload = await getLatestSensorReadings(fieldId);
    ws.send(JSON.stringify({
      type: "sensor_snapshot",
      fieldId,
      timestamp: payload.updatedAt || new Date().toISOString(),
      data: payload
    }));
  } catch (error) {
    ws.send(JSON.stringify({
      type: "error",
      message: error.message
    }));
  }
}

export function attachSensorStreamServer(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const fieldId = parseFieldId(request.url || "");
    if (!fieldId) {
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request, fieldId);
    });
  });

  wss.on("connection", async (ws, _request, fieldId) => {
    const interval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        sendSensorSnapshot(ws, fieldId);
      }
    }, 3000);

    clients.set(ws, { fieldId, interval });
    await sendSensorSnapshot(ws, fieldId);

    ws.on("close", () => {
      clearInterval(interval);
      clients.delete(ws);
    });

    ws.on("error", (error) => {
      logger.warn("websocket_client_error", { fieldId, error: error.message });
    });
  });
}

export function broadcastFieldUpdate(fieldId, payload) {
  for (const [ws, metadata] of clients.entries()) {
    if (metadata.fieldId === fieldId && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        fieldId,
        ...payload
      }));
    }
  }
}

export function broadcastAlertEvent(alert) {
  for (const [ws, metadata] of clients.entries()) {
    if ((metadata.fieldId === alert.fieldId || metadata.fieldId === "all") && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: "alert",
        timestamp: new Date().toISOString(),
        alert
      }));
    }
  }
}
