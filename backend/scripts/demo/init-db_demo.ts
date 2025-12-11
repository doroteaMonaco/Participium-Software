import path from "path";
import fs from "fs";
import { logInfo, logWarn, logError } from "@services/loggingService";
import { initializeDatabase, closeDatabase, prisma } from "@database";
import { initializeRedis, closeRedis } from "@redis";
import { roleType, Category, ReportStatus } from "@models/enums";
import { roleRepository } from "@repositories/roleRepository";
import {
  CreateBaseUserDto,
  CitizenDto,
  MunicipalityUserDto,
  ExternalMaintainerUserDto,
} from "@dto/userDto";
import { CreateReportDto, ReportDto } from "@dto/reportDto";
import { createCommentDto } from "@models/dto/commentDto";

import { userService } from "@services/userService";
import reportService from "@services/reportService";
import imageService from "@services/imageService";
import reportRepository from "@repositories/reportRepository";
import { create } from "domain";

const DEFAULT_ADMIN = {
  firstName: process.env.ADMIN_NAME || "Admin",
  lastName: process.env.ADMIN_SURNAME || "User",
  username: process.env.ADMIN_USERNAME || "admin",
  email: process.env.ADMIN_EMAIL || "admin@participium.com",
  password: process.env.ADMIN_PASSWORD || "admin",
};

const DEFAULT_MUNICIPALITY_ROLES = [
  "municipal public relations officer", // For reviewing and approving/rejecting reports
  "municipal administrator", // General administrator and fallback for OTHER category
  "public works project manager", // For PUBLIC_LIGHTING, ROADS_URBAN_FURNISHINGS, SEWER_SYSTEM
  "sanitation and waste management officer", // For WASTE
  "environmental protection officer", // For WATER_SUPPLY_DRINKING_WATER
  "traffic and mobility coordinator", // For ROAD_SIGNS_TRAFFIC_LIGHTS
  "parks and green spaces officer", // For PUBLIC_GREEN_AREAS_PLAYGROUNDS
  "urban planning specialist", // For ARCHITECTURAL_BARRIERS
];

async function waitForDatabaseRedisConnection(
  retries = 10,
  delay = 2000
): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      await initializeDatabase();
      await initializeRedis();
      logInfo("Database and Redis connection established.");
      return true;
    } catch (err) {
      logWarn(
        `Database and Redis not ready (${i + 1}/${retries}), retrying in ${delay}ms...`
      );
      await new Promise((res) => setTimeout(res, delay));
    }
  }

  logError("Unable to connect to the database after multiple retries.");
  return false;
}

async function getConfiguration(configurationFilePath: string) {
  let configData: any = {};
  // load file if present
  if (fs.existsSync(configurationFilePath)) {
    try {
      const raw = await fs.promises.readFile(configurationFilePath, "utf8");
      configData = JSON.parse(raw);
    } catch (err: any) {
      logWarn(
        `Failed to read/parse ${configurationFilePath}: ${err?.message || err}`
      );
    }
  } else {
    logWarn(`${configurationFilePath} not found, using defaults`);
  }

  return configData;
}

async function seedMunicipalityRoles(
  municipality_roles: string[] = DEFAULT_MUNICIPALITY_ROLES
) {
  try {
    // ensure uniqueness and deterministic order
    Array.from(new Set(municipality_roles))
      .map((r) => r.trim())
      .filter((r) => r.length > 0)
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

async function createAdminUserIfMissing(
  adminUser: CreateBaseUserDto = DEFAULT_ADMIN
) {
  try {
    await userService.registerUser(adminUser, roleType.ADMIN);
    logInfo(
      `Admin user created (username="${adminUser.username}", email="${adminUser.email}").`
    );
  } catch (err: any) {
    logError("Error creating admin user:", err?.message || err);
  }
}

async function createMunicipalityUsers(
  municipalityUser: MunicipalityUserDto[]
) {
  for (const user of municipalityUser) {
    try {
      await userService.createMunicipalityUser(
        user as CreateBaseUserDto,
        user.firstName,
        user.lastName,
        user.municipality_role_id
      );
      logInfo(
        `Municipality user created (username="${user.username}", email="${user.email}").`
      );
    } catch (err: any) {
      logError("Error creating municipality user:", err?.message || err);
    }
  }
}

async function createExternalMaintainerUsers(
  externalMaintainerUser: ExternalMaintainerUserDto[]
) {
  for (const user of externalMaintainerUser) {
    try {
      await userService.createExternalMaintainerUser(
        user as CreateBaseUserDto,
        user.companyName,
        user.category as Category
      );
      logInfo(
        `External maintainer user created (username="${user.username}", email="${user.email}").`
      );
    } catch (err: any) {
      logError("Error creating external maintainer user:", err?.message || err);
    }
  }
}

async function createCitizenUsers(citizenUser: CitizenDto[]) {
  for (const user of citizenUser) {
    try {
      await userService.registerUser(
        user as CreateBaseUserDto,
        roleType.CITIZEN
      );
      logInfo(
        `Citizen user created (username="${user.username}", email="${user.email}").`
      );
    } catch (err: any) {
      logError("Error creating citizen user:", err?.message || err);
    }
  }
}

/**
 * Read demo images from `backend/scripts/demo/images`.
 * - If the requested filenames exist there, read and store them in Redis using imageService.storeTemporaryImages.
 *
 * Returns an array of temp keys understood by the imageService.
 */
async function createTempImageKeysFromFilenames(filenames: string[]) {
  const demoImagesDir = path.resolve(__dirname, "images");

  if (!filenames || filenames.length === 0) {
    throw new Error(
      "No photo filenames provided for report. Place at least one image in backend/scripts/demo/images and list it in participium.json"
    );
  }

  const imagesToStore: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
  }[] = [];

  for (const name of filenames) {
    const filePath = path.join(demoImagesDir, name);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Demo image not found: ${filePath}`);
    }

    try {
      const buffer = await fs.promises.readFile(filePath);
      const ext = (name.split(".").pop() || "jpg").toLowerCase();
      const mimetype =
        ext === "png"
          ? "image/png"
          : ext === "webp"
            ? "image/webp"
            : "image/jpeg";

      imagesToStore.push({
        buffer,
        mimetype,
        originalname: name,
      });
    } catch (err: any) {
      throw new Error(
        `Failed to read demo image ${filePath}: ${err?.message || err}`
      );
    }
  }

  try {
    const tempKeys = await imageService.storeTemporaryImages(
      imagesToStore as any
    );
    if (!tempKeys || tempKeys.length === 0) {
      throw new Error(
        "imageService.storeTemporaryImages returned no temporary keys"
      );
    }
    return tempKeys;
  } catch (err: any) {
    throw new Error(
      `Failed to store demo images in Redis: ${err?.message || err}`
    );
  }
}

async function createReports(
  reports: any[]
): Promise<Array<{ created: any; source: any }>> {
  const createdPairs: Array<{ created: any; source: any }> = [];

  for (const source of reports) {
    try {
      const tempKeys = await createTempImageKeysFromFilenames(
        source.photos || []
      );

      if (!tempKeys) {
        throw new Error("Failed to create temporary image keys.");
      }

      const dto: CreateReportDto = {
        title: source.title,
        description: source.description,
        category: source.category,
        latitude: source.latitude,
        longitude: source.longitude,
        anonymous: !!source.anonymous,
        photoKeys: tempKeys,
      };

      if (!source.user_id) {
        throw new Error("Report must have a user_id to be created.");
      }

      const created = await reportService.submitReport(dto, source.user_id);
      logInfo(`Created report id=${created.id} title="${source.title}"`);

      // Handle statuses that can be set immediately (these may bypass transition rules)
      const desiredStatus = (source.status || "").toUpperCase();
      switch (desiredStatus) {
        case ReportStatus.PENDING_APPROVAL:
        // Done in updateReports)
        case ReportStatus.IN_PROGRESS:
        case ReportStatus.RESOLVED:
          break;
        case ReportStatus.REJECTED:
        case ReportStatus.ASSIGNED:
          const new_status = await reportService.updateReportStatus(
            created.id,
            desiredStatus,
            source.rejectionReason || undefined
          );

          created.status = new_status;
          logInfo(`Report ${created.id} set to ${desiredStatus}`);
          break;
        default:
          if (desiredStatus) {
            logWarn(
              `Unknown desired status "${desiredStatus}" for report ${created.id}. Will skip for now.`
            );
          }
      }

      // If the source explicitly requested an external maintainer assignment, set it now
      if (source.externalMaintainerId) {
        try {
          await reportRepository.update(created.id, {
            externalMaintainerId: source.externalMaintainerId,
          });
          logInfo(
            `Report ${created.id} explicit externalMaintainerId set to ${source.externalMaintainerId}`
          );
        } catch (err: any) {
          logWarn(
            `Failed to set externalMaintainerId for report ${created.id}: ${err?.message || err}`
          );
        }
      }

      createdPairs.push({ created, source });
    } catch (err: any) {
      logError("Error creating report:", err);
    }
  }

  return createdPairs;
}

async function updateReports(
  createdPairs: Array<{ created: any; source: any }>
) {
  for (const pair of createdPairs) {
    const created = pair.created;
    const source = pair.source;
    try {
      const desiredStatus = (source.status || "").toUpperCase();

      if (
        desiredStatus === ReportStatus.IN_PROGRESS ||
        desiredStatus === ReportStatus.RESOLVED
      ) {
        // Use direct repository update to set these statuses after comments are created
        await reportRepository.update(created.id, {
          status: desiredStatus,
          assignedOffice: source.assignedOffice ?? null,
          assignedOfficerId: source.assignedOfficerId ?? null,
          externalMaintainerId: source.externalMaintainerId ?? null,
          rejectionReason: source.rejectionReason ?? null,
        });
        logInfo(`Report ${created.id} updated to ${desiredStatus}`);
      }
    } catch (err: any) {
      logWarn(
        `Failed to update report ${created.id} to ${source.status}: ${err?.message || err}`
      );
    }
  }
}

async function createComments(comments: any[]) {
  for (const c of comments) {
    try {
      const dto: createCommentDto = {
        reportId: c.reportId,
        content: c.content,
        authorType: c.municipality_user_id
          ? "MUNICIPALITY"
          : "EXTERNAL_MAINTAINER",
        authorId: c.municipality_user_id || c.external_maintainer_id,
      } as any;

      await reportService.addCommentToReport(dto);
      logInfo(`Added comment to report ${c.reportId}`);
    } catch (err: any) {
      logWarn(
        `Failed to add comment to report ${c.reportId}: ${err?.message || err}`
      );
    }
  }
}

async function main() {
  try {
    const dbReady = await waitForDatabaseRedisConnection();
    if (!dbReady) {
      process.exit(1);
      return;
    }

    const configFile =
      process.env.PARTICIPIUM_FILE ||
      path.resolve(__dirname, "./participium.json");
    const configData = await getConfiguration(configFile);

    const municipalityRoles =
      configData.municipality_role || DEFAULT_MUNICIPALITY_ROLES;
    await seedMunicipalityRoles(municipalityRoles);

    // Users
    await createAdminUserIfMissing(configData.admin_user || DEFAULT_ADMIN);
    await createMunicipalityUsers(configData.municipality_user || []);
    await createExternalMaintainerUsers(configData.external_maintainer || []);
    await createCitizenUsers(configData.user || []);

    const createdPairs = await createReports(configData.report || []);
    await createComments(configData.comment || []);
    await updateReports(createdPairs || []);

    logInfo("Database initialization completed successfully.");
  } catch (err: any) {
    logError("Initialization failed:", err?.message || err);
    process.exit(1);
  } finally {
    try {
      await closeDatabase();
      await closeRedis();
    } catch (err) {
      logWarn(`Error closing DB or Redis connection: ${err}`);
    }
  }
}

if (require.main === module) {
  main();
}

export { main };
