import { logInfo, logWarn, logError } from "@services/loggingService";
import { initializeDatabase, closeDatabase } from "@database";
import { userRepository } from "@repositories/userRepository";
import { roleRepository } from "@repositories/roleRepository";

const DEFAULT_ADMIN = {
  firstName: "Admin",
  lastName: "User",
  username: "admin",
  email: "admin@participium.com",
  passwordPlain: "$2b$10$mlXLWqLjuxpavH71sQlHK.jmxQazcdGxWF8z.jyKbuz5vOQKVrVIC",
};
const DEFAULT_MUNICIPALITY_ROLES = [
  "municipal public relations officer",
  "municipal administrator",
  "technical office staff member",
  "finance and budget officer",
  "urban planning specialist",
  "public works project manager",
  "social services caseworker",
  "environmental protection officer",
  "cultural affairs coordinator",
  "education and youth services officer",
  "procurement and contracts specialist",
  "legal affairs counsel",
  "it systems administrator",
  "traffic and mobility coordinator",
  "civil protection and emergency planner",
  "sanitation and waste management officer",
  "parks and green spaces officer",
  "civil registry clerk",
];

async function waitForDatabaseConnection(
  retries = 10,
  delay = 2000,
): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      await initializeDatabase();
      logInfo("Database connection established.");
      return true;
    } catch (err) {
      logWarn(
        `Database not ready (${i + 1}/${retries}), retrying in ${delay}ms...`,
      );
      await new Promise((res) => setTimeout(res, delay));
    }
  }

  logError("Unable to connect to the database after multiple retries.");
  return false;
}

async function seedMunicipalityRoles(
  municipality_roles: string[] = DEFAULT_MUNICIPALITY_ROLES,
) {
  try {
    // ensure uniqueness and deterministic order
    Array.from(new Set(municipality_roles))
      .map((r) => r.trim())
      .filter((r) => r.length > 0)
      .sort()
      .forEach(async (role) => {
        try {
          // create role via repository (repository should skip/handle existing entries or throw)
          await roleRepository.createMunicipalityRole(role);
          logInfo(`Added municipality role: ${role}`);
        } catch (err: any) {
          // ignore unique-constraint type errors and continue
          logWarn(`Could not create role "${role}": ${err?.message || err}`);
        }
      });

    logInfo("Municipality roles seeded (or already present).");
  } catch (err: any) {
    logWarn(`Seeding municipality roles failed: ${err?.message || err}`);
  }
}

async function createAdminUserIfMissing(adminUser = DEFAULT_ADMIN) {
  try {
    const existing =
      (await userRepository.findUserByUsername(adminUser.username)) ||
      (await userRepository.findUserByEmail(adminUser.email));

    if (existing) {
      logWarn("Admin/root user already exists.");
      return;
    }

    await userRepository.createUserWithRole(
      adminUser.email,
      adminUser.username,
      adminUser.firstName,
      adminUser.lastName,
      adminUser.passwordPlain,
      "ADMIN",
    );
    logInfo(
      `Admin user created (username="${adminUser.username}", email="${adminUser.email}").`,
    );
  } catch (err: any) {
    logError("Error creating admin user:", err?.message || err);
  }
}

async function main() {
  try {
    const dbReady = await waitForDatabaseConnection();
    if (!dbReady) {
      process.exit(1);
      return;
    }

    await seedMunicipalityRoles();
    await createAdminUserIfMissing();
  } catch (err: any) {
    logError("Initialization failed:", err?.message || err);
    process.exit(1);
  } finally {
    try {
      await closeDatabase();
    } catch (err) {
      logWarn(`Error closing DB connection: ${err}`);
    }
  }
}

if (require.main === module) {
  main();
}

export { main };
