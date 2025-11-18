import app from "@app";
import { CONFIG } from "@config";
import { logError, logInfo } from "@services/loggingService";
import { closeDatabase, initializeDatabase } from "@database";
import { closeRedis, initializeRedis } from "@redis";
import { Server } from "http";

let server: Server;

async function startServer() {
  try {
    await initializeDatabase();
    await initializeRedis();
    server = app.listen(CONFIG.APP_PORT, () => {
      logInfo(`Server running on http://${CONFIG.APP_HOST}:${CONFIG.APP_PORT}`);
      logInfo(
        `Swagger UI available at http://${CONFIG.APP_HOST}:${CONFIG.APP_PORT}${CONFIG.ROUTES.SWAGGER}`,
      );
    });
  } catch (error) {
    logError("Error in app initialization:", error);
    process.exit(1);
  }
}

function closeServer(): Promise<void> {
  if (server) {
    return new Promise((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  } else {
    return Promise.resolve();
  }
}

async function shutdown() {
  logInfo("Shutting down server...");

  await closeServer();
  await closeDatabase();
  await closeRedis();

  logInfo("Shutdown complete.");
  process.exit(0);
}

startServer();

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
