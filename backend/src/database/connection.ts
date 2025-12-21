import { logError, logInfo } from "@services/loggingService";
import { PrismaClient } from "@prisma/client";

export const prisma: PrismaClient = (global as any).testPrisma || new PrismaClient();

export async function initializeDatabase() {
  if (!(global as any).testPrisma) {
    await prisma.$connect();
    logInfo("Successfully connected to DB");
  }
}

export async function closeDatabase() {
  try {
    if (!(global as any).testPrisma) {
      await prisma.$disconnect();
      logInfo("Database connection closed.");
    }
  } catch (error) {
    logError("Error while closing database:", error);
  }
}
