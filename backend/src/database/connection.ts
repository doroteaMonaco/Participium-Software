import { logError, logInfo } from "@services/loggingService";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function initializeDatabase() {
  await prisma.$connect();
  logInfo("Successfully connected to DB");
}

export async function closeDatabase() {
  try {
    await prisma.$disconnect();
    logInfo("Database connection closed.");
  } catch (error) {
    logError("Error while closing database:", error);
  }
}
