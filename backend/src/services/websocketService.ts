import WebSocket, { WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import jwt, { JwtPayload } from "jsonwebtoken";
import { logInfo, logError, logDebug } from "@services/loggingService";
import { SECRET_KEY } from "@config";
import { roleType } from "@models/enums";
import reportRepository from "@repositories/reportRepository";

let wss: WebSocketServer | null = null;
const clients = new Map<string, Set<WebSocket>>();

const getUserIdAndRoleFromRequest = (
  req: IncomingMessage,
): { userId: number; role: string } | null => {
  try {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token) return null;

    const decoded = jwt.verify(token, SECRET_KEY) as JwtPayload;
    return { userId: Number(decoded.id), role: decoded.role };
  } catch (error) {
    logError("WebSocket authentication failed:", error);
    return null;
  }
};

export const startWebSocketServer = (port: number = 8080): void => {
  if (wss) {
    logInfo("WebSocket server is already running.");
    return;
  }

  try {
    wss = new WebSocketServer({ port });

    wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
      const user = getUserIdAndRoleFromRequest(req);

      if (!user) {
        logInfo("WebSocket connection rejected: No valid token provided.");
        ws.close(1008, "Authentication failed");
        return;
      }

      const { userId, role } = user;
      const clientKey = `${role}:${userId}`;

      logInfo(
        `New WebSocket connection established for user ${userId} (${role}).`,
      );

      if (!clients.has(clientKey)) {
        clients.set(clientKey, new Set());
      }
      clients.get(clientKey)?.add(ws);

      ws.on("message", async (message) => {
        try {
          const parsedMessage = JSON.parse(message.toString());
          logDebug(`Received message from user ${userId}: ${message}`);

          if (
            parsedMessage.type === "MARK_COMMENTS_AS_READ" &&
            parsedMessage.reportId
          ) {
            const reportId = Number(parsedMessage.reportId);
            if (role === roleType.MUNICIPALITY) {
              await reportRepository.markExternalMaintainerCommentsAsRead(
                reportId,
              );
            } else if (role === roleType.EXTERNAL_MAINTAINER) {
              await reportRepository.markMunicipalityCommentsAsRead(reportId);
            }
          }
        } catch (error) {
          logError("Error processing WebSocket message:", error);
        }
      });

      ws.on("close", () => {
        logInfo(`WebSocket connection closed for user ${userId}.`);
        const userSockets = clients.get(clientKey);
        if (userSockets) {
          userSockets.delete(ws);
          if (userSockets.size === 0) {
            clients.delete(clientKey);
          }
        }
      });

      ws.send(JSON.stringify({ type: "CONNECTED", message: "Welcome to the Participium WebSocket Server!" }));
    });

    wss.on("listening", () => {
      logInfo(`WebSocket server started on port ${port}`);
    });

    wss.on("error", (error) => {
      logError("WebSocket server error:", error);
    });
  } catch (error) {
    logError("Failed to start WebSocket server:", error);
    throw error;
  }
};

export const stopWebSocketServer = (): void => {
  if (wss) {
    wss.close(() => {
      logInfo("WebSocket server stopped.");
      wss = null;
      clients.clear();
    });
  }
};

export const getWebSocketServer = (): WebSocketServer | null => {
  return wss;
};

export const sendMessageToUser = (
  userId: number,
  role: string,
  message: any,
): void => {
  const clientKey = `${role}:${userId}`;
  const userSockets = clients.get(clientKey);
  logInfo(`Sending message to user ${userId} (${role}): ${JSON.stringify(message)}`);
  if (userSockets) {
    const payload = JSON.stringify(message);
    userSockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    });
  }
};

