import { closeTestDatabase } from "./test-datasource";

export default async function globalTeardown() {
  try {
    await closeTestDatabase();
  } catch (error) {
    console.error("Global teardown error:", error);
  }
}
