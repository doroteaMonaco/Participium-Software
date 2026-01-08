import WebSocket, { WebSocketServer } from "ws";
import { IncomingMessage } from "node:http";
import jwt from "jsonwebtoken";
import {
  startWebSocketServer,
  stopWebSocketServer,
  getWebSocketServer,
  sendMessageToUser,
} from "@services/websocketService";
import * as loggingService from "@services/loggingService";
import reportRepository from "@repositories/reportRepository";
import { roleType } from "@models/enums";

jest.mock("ws");
jest.mock("@services/loggingService");
jest.mock("@repositories/reportRepository");
jest.mock("jsonwebtoken");

describe("websocketService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset wss to null for each test
    if (getWebSocketServer()) {
      stopWebSocketServer();
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------- getUserIdAndRoleFromRequest (via connection) --------
  describe("getUserIdAndRoleFromRequest", () => {
    it("should extract userId and role from valid JWT token in URL", async () => {
      const mockDecodedToken = { id: 123, role: roleType.CITIZEN };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);

      const mockWs = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
        readyState: WebSocket.OPEN,
      };

      const mockReq = {
        url: "ws://localhost:8080/?token=valid-jwt",
        headers: { host: "localhost:8080" },
      } as unknown as IncomingMessage;

      const mockWssInstance = {
        on: jest.fn((event, callback) => {
          if (event === "connection") {
            // Trigger connection callback
            callback(mockWs, mockReq);
          }
        }),
        close: jest.fn((cb) => cb?.()),
      };

      (WebSocketServer as unknown as jest.Mock).mockImplementation(
        () => mockWssInstance,
      );

      startWebSocketServer(8080);

      expect(loggingService.logInfo).toHaveBeenCalledWith(
        expect.stringContaining("New WebSocket connection established"),
      );
    });

    it("should return null and close connection when token is missing", async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ id: 123, role: "CITIZEN" });

      const mockWs = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
        readyState: WebSocket.OPEN,
      };

      const mockReq = {
        url: "ws://localhost:8080/",
        headers: { host: "localhost:8080" },
      } as unknown as IncomingMessage;

      const mockWssInstance = {
        on: jest.fn((event, callback) => {
          if (event === "connection") {
            callback(mockWs, mockReq);
          }
        }),
        close: jest.fn((cb) => cb?.()),
      };

      (WebSocketServer as unknown as jest.Mock).mockImplementation(
        () => mockWssInstance,
      );

      startWebSocketServer(8080);

      expect(mockWs.close).toHaveBeenCalledWith(
        1008,
        "Authentication failed",
      );
      expect(loggingService.logInfo).toHaveBeenCalledWith(
        "WebSocket connection rejected: No valid token provided.",
      );
    });

    it("should return null and close connection when JWT verification fails", async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid token");
      });

      const mockWs = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
        readyState: WebSocket.OPEN,
      };

      const mockReq = {
        url: "ws://localhost:8080/?token=invalid-jwt",
        headers: { host: "localhost:8080" },
      } as unknown as IncomingMessage;

      const mockWssInstance = {
        on: jest.fn((event, callback) => {
          if (event === "connection") {
            callback(mockWs, mockReq);
          }
        }),
        close: jest.fn((cb) => cb?.()),
      };

      (WebSocketServer as unknown as jest.Mock).mockImplementation(
        () => mockWssInstance,
      );

      startWebSocketServer(8080);

      expect(mockWs.close).toHaveBeenCalledWith(
        1008,
        "Authentication failed",
      );
      expect(loggingService.logError).toHaveBeenCalledWith(
        "WebSocket authentication failed:",
        expect.any(Error),
      );
    });
  });

  // -------- startWebSocketServer --------
  describe("startWebSocketServer", () => {
    it("should start WebSocket server on specified port", () => {
      const mockWssInstance = {
        on: jest.fn(),
        close: jest.fn((cb) => cb?.()),
      };

      (WebSocketServer as unknown as jest.Mock).mockImplementation(
        () => mockWssInstance,
      );

      startWebSocketServer(8080);

      expect(WebSocketServer).toHaveBeenCalledWith({ port: 8080 });
      expect(loggingService.logInfo).toHaveBeenCalledWith(
        expect.stringContaining("WebSocket server"),
      );
    });

    it("should not start if server is already running", () => {
      const mockWssInstance = {
        on: jest.fn(),
        close: jest.fn((cb) => cb?.()),
      };

      (WebSocketServer as unknown as jest.Mock).mockImplementation(
        () => mockWssInstance,
      );

      startWebSocketServer(8080);
      const firstCallCount = (WebSocketServer as unknown as jest.Mock).mock.calls.length;

      startWebSocketServer(8080);
      const secondCallCount = (WebSocketServer as unknown as jest.Mock).mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount);
      expect(loggingService.logInfo).toHaveBeenCalledWith(
        "WebSocket server is already running.",
      );
    });

    it("should log listening event on successful start", () => {
      const mockWssInstance = {
        on: jest.fn((event, callback) => {
          if (event === "listening") {
            callback();
          }
        }),
        close: jest.fn((cb) => cb?.()),
      };

      (WebSocketServer as unknown as jest.Mock).mockImplementation(
        () => mockWssInstance,
      );

      startWebSocketServer(9000);

      expect(loggingService.logInfo).toHaveBeenCalledWith(
        "WebSocket server started on port 9000",
      );
    });

    it("should handle server errors and log them", () => {
      const mockError = new Error("Server startup failed");
      const mockWssInstance = {
        on: jest.fn((event, callback) => {
          if (event === "error") {
            callback(mockError);
          }
        }),
        close: jest.fn((cb) => cb?.()),
      };

      (WebSocketServer as unknown as jest.Mock).mockImplementation(
        () => mockWssInstance,
      );

      startWebSocketServer(8080);

      expect(loggingService.logError).toHaveBeenCalledWith(
        "WebSocket server error:",
        mockError,
      );
    });

    it("should throw error if server creation fails", () => {
      (WebSocketServer as unknown as jest.Mock).mockImplementation(() => {
        throw new Error("Failed to create server");
      });

      expect(() => startWebSocketServer(8080)).toThrow(
        "Failed to create server",
      );
      expect(loggingService.logError).toHaveBeenCalledWith(
        "Failed to start WebSocket server:",
        expect.any(Error),
      );
    });
  });

  // -------- stopWebSocketServer --------
  describe("stopWebSocketServer", () => {
    it("should stop WebSocket server and clean up resources", () => {
      const mockWssInstance = {
        on: jest.fn(),
        close: jest.fn((cb) => cb?.()),
      };

      (WebSocketServer as unknown as jest.Mock).mockImplementation(
        () => mockWssInstance,
      );

      startWebSocketServer(8080);
      stopWebSocketServer();

      expect(mockWssInstance.close).toHaveBeenCalled();
      expect(loggingService.logInfo).toHaveBeenCalledWith(
        "WebSocket server stopped.",
      );
      expect(getWebSocketServer()).toBeNull();
    });

    it("should do nothing if server is not running", () => {
      stopWebSocketServer();

      expect(loggingService.logInfo).not.toHaveBeenCalledWith(
        "WebSocket server stopped.",
      );
    });
  });

  // -------- getWebSocketServer --------
  describe("getWebSocketServer", () => {
    it("should return null when server is not started", () => {
      expect(getWebSocketServer()).toBeNull();
    });

    it("should return WebSocket server instance when running", () => {
      const mockWssInstance = {
        on: jest.fn(),
        close: jest.fn((cb) => cb?.()),
      };

      (WebSocketServer as unknown as jest.Mock).mockImplementation(
        () => mockWssInstance,
      );

      startWebSocketServer(8080);
      const server = getWebSocketServer();

      expect(server).not.toBeNull();
      expect(server).toBe(mockWssInstance);
    });
  });

  // -------- WebSocket connection message handling --------
  describe("WebSocket message handling", () => {
    it("should handle MARK_COMMENTS_AS_READ for MUNICIPALITY role", async () => {
      const mockWs = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
        readyState: WebSocket.OPEN,
      };

      let messageHandler: any;
      mockWs.on.mockImplementation((event, handler) => {
        if (event === "message") {
          messageHandler = handler;
        }
      });

      const mockDecodedToken = { id: 123, role: roleType.MUNICIPALITY };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);

      const mockReq = {
        url: "ws://localhost:8080/?token=valid-jwt",
        headers: { host: "localhost:8080" },
      } as unknown as IncomingMessage;

      const mockWssInstance = {
        on: jest.fn((event, callback) => {
          if (event === "connection") {
            callback(mockWs, mockReq);
          }
        }),
        close: jest.fn((cb) => cb?.()),
      };

      (WebSocketServer as unknown as jest.Mock).mockImplementation(
        () => mockWssInstance,
      );

      (reportRepository.markExternalMaintainerCommentsAsRead as jest.Mock).mockResolvedValue(
        undefined,
      );

      startWebSocketServer(8080);

      const message = JSON.stringify({
        type: "MARK_COMMENTS_AS_READ",
        reportId: 5,
      });

      await messageHandler(Buffer.from(message));

      expect(
        reportRepository.markExternalMaintainerCommentsAsRead,
      ).toHaveBeenCalledWith(5);
      expect(loggingService.logDebug).toHaveBeenCalledWith(
        expect.stringContaining("Received message from user"),
      );
    });

    it("should handle MARK_COMMENTS_AS_READ for EXTERNAL_MAINTAINER role", async () => {
      const mockWs = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
        readyState: WebSocket.OPEN,
      };

      let messageHandler: any;
      mockWs.on.mockImplementation((event, handler) => {
        if (event === "message") {
          messageHandler = handler;
        }
      });

      const mockDecodedToken = { id: 456, role: roleType.EXTERNAL_MAINTAINER };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);

      const mockReq = {
        url: "ws://localhost:8080/?token=valid-jwt",
        headers: { host: "localhost:8080" },
      } as unknown as IncomingMessage;

      const mockWssInstance = {
        on: jest.fn((event, callback) => {
          if (event === "connection") {
            callback(mockWs, mockReq);
          }
        }),
        close: jest.fn((cb) => cb?.()),
      };

      (WebSocketServer as unknown as jest.Mock).mockImplementation(
        () => mockWssInstance,
      );

      (reportRepository.markMunicipalityCommentsAsRead as jest.Mock).mockResolvedValue(
        undefined,
      );

      startWebSocketServer(8080);

      const message = JSON.stringify({
        type: "MARK_COMMENTS_AS_READ",
        reportId: 10,
      });

      await messageHandler(Buffer.from(message));

      expect(reportRepository.markMunicipalityCommentsAsRead).toHaveBeenCalledWith(
        10,
      );
    });

    it("should handle invalid JSON message gracefully", async () => {
      const mockWs = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
        readyState: WebSocket.OPEN,
      };

      let messageHandler: any;
      mockWs.on.mockImplementation((event, handler) => {
        if (event === "message") {
          messageHandler = handler;
        }
      });

      const mockDecodedToken = { id: 123, role: roleType.MUNICIPALITY };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);

      const mockReq = {
        url: "ws://localhost:8080/?token=valid-jwt",
        headers: { host: "localhost:8080" },
      } as unknown as IncomingMessage;

      const mockWssInstance = {
        on: jest.fn((event, callback) => {
          if (event === "connection") {
            callback(mockWs, mockReq);
          }
        }),
        close: jest.fn((cb) => cb?.()),
      };

      (WebSocketServer as unknown as jest.Mock).mockImplementation(
        () => mockWssInstance,
      );

      startWebSocketServer(8080);

      await messageHandler(Buffer.from("invalid json"));

      expect(loggingService.logError).toHaveBeenCalledWith(
        "Error processing WebSocket message:",
        expect.any(Error),
      );
    });

    it("should ignore messages without reportId", async () => {
      const mockWs = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
        readyState: WebSocket.OPEN,
      };

      let messageHandler: any;
      mockWs.on.mockImplementation((event, handler) => {
        if (event === "message") {
          messageHandler = handler;
        }
      });

      const mockDecodedToken = { id: 123, role: roleType.MUNICIPALITY };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);

      const mockReq = {
        url: "ws://localhost:8080/?token=valid-jwt",
        headers: { host: "localhost:8080" },
      } as unknown as IncomingMessage;

      const mockWssInstance = {
        on: jest.fn((event, callback) => {
          if (event === "connection") {
            callback(mockWs, mockReq);
          }
        }),
        close: jest.fn((cb) => cb?.()),
      };

      (WebSocketServer as unknown as jest.Mock).mockImplementation(
        () => mockWssInstance,
      );

      startWebSocketServer(8080);

      const message = JSON.stringify({ type: "MARK_COMMENTS_AS_READ" });

      await messageHandler(Buffer.from(message));

      expect(
        reportRepository.markExternalMaintainerCommentsAsRead,
      ).not.toHaveBeenCalled();
      expect(reportRepository.markMunicipalityCommentsAsRead).not.toHaveBeenCalled();
    });

    it("should handle other message types gracefully", async () => {
      const mockWs = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
        readyState: WebSocket.OPEN,
      };

      let messageHandler: any;
      mockWs.on.mockImplementation((event, handler) => {
        if (event === "message") {
          messageHandler = handler;
        }
      });

      const mockDecodedToken = { id: 123, role: roleType.MUNICIPALITY };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);

      const mockReq = {
        url: "ws://localhost:8080/?token=valid-jwt",
        headers: { host: "localhost:8080" },
      } as unknown as IncomingMessage;

      const mockWssInstance = {
        on: jest.fn((event, callback) => {
          if (event === "connection") {
            callback(mockWs, mockReq);
          }
        }),
        close: jest.fn((cb) => cb?.()),
      };

      (WebSocketServer as unknown as jest.Mock).mockImplementation(
        () => mockWssInstance,
      );

      startWebSocketServer(8080);

      const message = JSON.stringify({ type: "PING" });

      await messageHandler(Buffer.from(message));

      expect(
        reportRepository.markExternalMaintainerCommentsAsRead,
      ).not.toHaveBeenCalled();
      expect(reportRepository.markMunicipalityCommentsAsRead).not.toHaveBeenCalled();
    });
  });

  // -------- WebSocket connection close handling --------
  describe("WebSocket connection close", () => {
    it("should remove socket from clients map when connection closes", () => {
      const mockWs = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
        readyState: WebSocket.OPEN,
      };

      let closeHandler: any;
      mockWs.on.mockImplementation((event, handler) => {
        if (event === "close") {
          closeHandler = handler;
        }
      });

      const mockDecodedToken = { id: 123, role: roleType.MUNICIPALITY };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);

      const mockReq = {
        url: "ws://localhost:8080/?token=valid-jwt",
        headers: { host: "localhost:8080" },
      } as unknown as IncomingMessage;

      const mockWssInstance = {
        on: jest.fn((event, callback) => {
          if (event === "connection") {
            callback(mockWs, mockReq);
          }
        }),
        close: jest.fn((cb) => cb?.()),
      };

      (WebSocketServer as unknown as jest.Mock).mockImplementation(
        () => mockWssInstance,
      );

      startWebSocketServer(8080);
      closeHandler();

      expect(loggingService.logInfo).toHaveBeenCalledWith(
        expect.stringContaining("WebSocket connection closed"),
      );
    });
  });

  // -------- sendMessageToUser --------
  describe("sendMessageToUser", () => {
    it("should send message to connected user", () => {
      const mockWs = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
        readyState: WebSocket.OPEN,
      };

      const mockDecodedToken = { id: 123, role: roleType.MUNICIPALITY };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);

      const mockReq = {
        url: "ws://localhost:8080/?token=valid-jwt",
        headers: { host: "localhost:8080" },
      } as unknown as IncomingMessage;

      const mockWssInstance = {
        on: jest.fn((event, callback) => {
          if (event === "connection") {
            callback(mockWs, mockReq);
          }
        }),
        close: jest.fn((cb) => cb?.()),
      };

      (WebSocketServer as unknown as jest.Mock).mockImplementation(
        () => mockWssInstance,
      );

      startWebSocketServer(8080);

      const testMessage = { type: "TEST", data: "hello" };
      sendMessageToUser(123, roleType.MUNICIPALITY, testMessage);

      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify(testMessage));
      expect(loggingService.logInfo).toHaveBeenCalledWith(
        expect.stringContaining("Sending message to user"),
      );
    });

    it("should not send message to disconnected user", () => {
      const mockWs = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
        readyState: WebSocket.CLOSED, // Socket is closed
      };

      const mockDecodedToken = { id: 456, role: roleType.EXTERNAL_MAINTAINER };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);

      const mockReq = {
        url: "ws://localhost:8080/?token=valid-jwt",
        headers: { host: "localhost:8080" },
      } as unknown as IncomingMessage;

      const mockWssInstance = {
        on: jest.fn((event, callback) => {
          if (event === "connection") {
            callback(mockWs, mockReq);
          }
        }),
        close: jest.fn((cb) => cb?.()),
      };

      (WebSocketServer as unknown as jest.Mock).mockImplementation(
        () => mockWssInstance,
      );

      startWebSocketServer(8080);

      // Clear mock calls from the initial CONNECTED message
      (mockWs.send as jest.Mock).mockClear();

      const testMessage = { type: "TEST", data: "hello" };
      sendMessageToUser(456, roleType.EXTERNAL_MAINTAINER, testMessage);

      expect(mockWs.send).not.toHaveBeenCalled();
    });

    it("should handle message to non-existent user gracefully", () => {
      const mockWssInstance = {
        on: jest.fn(),
        close: jest.fn((cb) => cb?.()),
      };

      (WebSocketServer as unknown as jest.Mock).mockImplementation(
        () => mockWssInstance,
      );

      startWebSocketServer(8080);

      const testMessage = { type: "TEST", data: "hello" };
      sendMessageToUser(999, roleType.MUNICIPALITY, testMessage);

      expect(loggingService.logInfo).toHaveBeenCalledWith(
        expect.stringContaining("Sending message to user 999"),
      );
    });
  });

  // -------- Multiple connections for same user --------
  describe("Multiple connections for same user", () => {
    it("should handle multiple WebSocket connections for same user", () => {
      const mockWs1 = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
        readyState: WebSocket.OPEN,
      };

      const mockWs2 = {
        close: jest.fn(),
        send: jest.fn(),
        on: jest.fn(),
        readyState: WebSocket.OPEN,
      };

      const mockDecodedToken = { id: 123, role: roleType.MUNICIPALITY };
      (jwt.verify as jest.Mock).mockReturnValue(mockDecodedToken);

      const mockReq = {
        url: "ws://localhost:8080/?token=valid-jwt",
        headers: { host: "localhost:8080" },
      } as unknown as IncomingMessage;

      let connectionCallCount = 0;
      const mockWssInstance = {
        on: jest.fn((event, callback) => {
          if (event === "connection") {
            // Call the connection callback for both sockets
            callback(mockWs1, mockReq);
            connectionCallCount++;
            callback(mockWs2, mockReq);
          }
        }),
        close: jest.fn((cb) => cb?.()),
      };

      (WebSocketServer as unknown as jest.Mock).mockImplementation(
        () => mockWssInstance,
      );

      startWebSocketServer(8080);

      // Clear initial CONNECTED messages
      (mockWs1.send as jest.Mock).mockClear();
      (mockWs2.send as jest.Mock).mockClear();

      const testMessage = { type: "TEST", data: "broadcast" };
      sendMessageToUser(123, roleType.MUNICIPALITY, testMessage);

      expect(mockWs1.send).toHaveBeenCalledWith(JSON.stringify(testMessage));
      expect(mockWs2.send).toHaveBeenCalledWith(JSON.stringify(testMessage));
    });
  });
});
