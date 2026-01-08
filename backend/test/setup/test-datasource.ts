import { PrismaClient } from "@prisma/client";

// Create a SINGLE instance that will be shared across all tests
let testPrisma: PrismaClient | null = null;
let isConnected = false;

export async function getTestPrisma(): Promise<PrismaClient> {
  testPrisma ??= new PrismaClient();
  return testPrisma;
}

export async function initializeTestDatabase(): Promise<void> {
  if (isConnected) {
    return;
  }
  
  const prisma = await getTestPrisma();
  
  try {
    await prisma.$connect();
    isConnected = true;
  } catch (error) {
    console.error("Failed to connect to database:", error);
    throw error;
  }
}

export async function closeTestDatabase(): Promise<void> {
  if (testPrisma && isConnected) {
    await testPrisma.$disconnect();
    testPrisma = null;
    isConnected = false;
  }
}

export { getTestPrisma as getPrisma };
