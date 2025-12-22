import { initializeTestDatabase } from "./test-datasource";

export default async function globalSetup() {
  try {
    await initializeTestDatabase();
  } catch (error) {
    console.error("Global setup failed:", error);
    process.exit(1);
  }
}
