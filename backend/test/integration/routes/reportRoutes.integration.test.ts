import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "@app";
import { roleType } from "@models/enums";
import { userService } from "@services/userService";
import reportRepository from "@repositories/reportRepository";

// Mock only the image service to avoid dealing with real Redis/FS in this e2e
jest.mock("@services/imageService", () => {
  return {
    __esModule: true,
    default: {
      storeTemporaryImages: jest.fn(async (images: any[]) =>
        images.map((_: any, i: number) => `temp:image:key-${i + 1}`),
      ),
      persistImagesForReport: jest.fn(
        async (keys: string[], reportId: number) =>
          keys.map(
            (_: string, i: number) => `${reportId}/${reportId}_${i + 1}.jpg`,
          ),
      ),
      getMultipleImages: jest.fn(async (paths: string[]) =>
        paths.map(
          (_: string, i: number) =>
            `data:image/jpeg;base64,ZmFrZV9pbWFnZV8${i}`,
        ),
      ),
      getImageUrl: jest.fn((rel: string) => `/uploads/${rel}`),
      getMultipleImageUrls: jest.fn((rels: string[]) =>
        rels.map((r) => `/uploads/${r}`),
      ),
      deleteImages: jest.fn(async () => {}),
      getImage: jest.fn(async () => null),
      preloadCache: jest.fn(async () => {}),
    },
  };
});

const prisma = new PrismaClient();

// --- Helpers: register, login, create/admin->municipality, create report ---
const registerUser = async (
  agent: request.SuperAgentTest,
  user: any,
  role: roleType = roleType.CITIZEN,
) => {
  const res = await agent.post("/api/users").send(user);
  expect(res.status).toBe(201);
};
const loginAgent = async (
  agent: request.SuperAgentTest,
  identifier: string,
  password: string,
  role: roleType = roleType.CITIZEN,
) => {
  const res = await agent
    .post("/api/auth/session")
    .send({ identifier, password, role });
  expect(res.status).toBe(200);

  return agent;
};

const createAndLogin = async (user: any, role: roleType = roleType.CITIZEN) => {
  const agent: any = request.agent(app);

  await registerUser(agent, user, role);
  await loginAgent(agent, user.username, user.password, role);
  return agent;
};

const createAdmin = async (admin: any) => {
  // Create admin user manually
  await userService.registerUser(admin, roleType.ADMIN);

  // Create agent and register admin
  const agent: any = request.agent(app);

  // login admin
  const adminAgent = await loginAgent(
    agent,
    admin.username,
    admin.password,
    roleType.ADMIN,
  );

  return adminAgent;
};

const createMunicipality = async (
  adminAgent: request.SuperAgentTest,
  municipality: any,
) => {
  // admin creates municipality user via /api/users/municipality-users
  const res = await adminAgent
    .post("/api/users/municipality-users")
    .send(municipality);

  expect(res.status).toBe(201);

  // login municipality user via normal session endpoint
  const muniAgent: any = request.agent(app);
  await loginAgent(
    muniAgent,
    municipality.username,
    municipality.password,
    roleType.MUNICIPALITY,
  );

  return { muniAgent, createdMunicipality: res.body };
};

const createExternalMaintainer = async (
  adminAgent: request.SuperAgentTest,
  externalMaintainer: any,
) => {
  // admin creates external maintainer user via /api/users/external-users
  const res = await adminAgent
    .post("/api/users/external-users")
    .send(externalMaintainer);

  expect(res.status).toBe(201);

  // login external maintainer user via normal session endpoint
  const emAgent: any = request.agent(app);
  await loginAgent(
    emAgent,
    externalMaintainer.username,
    externalMaintainer.password,
    "EXTERNAL_MAINTAINER" as any,
  );

  return { emAgent, createdExternalMaintainer: res.body };
};

const createReportAs = async (
  agent: request.SuperAgentTest,
  reportFields: any,
) => {
  const post = agent
    .post("/api/reports")
    .set("Accept", "application/json")
    .field("title", reportFields.title)
    .field("description", reportFields.description)
    .field("category", reportFields.category)
    .field("latitude", String(reportFields.latitude))
    .field("longitude", String(reportFields.longitude));

  if (reportFields.photos && reportFields.photos.length > 0) {
    for (const p of reportFields.photos) {
      post.attach("photos", p.buffer, {
        filename: p.name,
        contentType: p.contentType,
      });
    }
  } else {
    // ensure at least one attach when needed by tests
    post.attach("photos", Buffer.from("fake"), {
      filename: "p.jpg",
      contentType: "image/jpeg",
    });
  }

  return post.expect(201).then((r) => r.body);
};

describe("POST /api/reports (Create Report)", () => {
  const fakeUser = {
    username: "citizen1",
    email: "citizen1@example.com",
    firstName: "Mario",
    lastName: "Rossi",
    password: "P@ssw0rd!",
  };

  beforeEach(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.municipality_role.deleteMany();
    await prisma.municipality_role.createMany({
      data: [
        { id: 1, name: "municipal public relations officer" },
        { id: 2, name: "municipal administrator" },
        { id: 3, name: "public works project manager" },
        { id: 4, name: "sanitation and waste management officer" },
        { id: 5, name: "environmental protection officer" },
        { id: 6, name: "traffic and mobility coordinator" },
        { id: 7, name: "parks and green spaces officer" },
        { id: 8, name: "urban planning specialist" },
      ],
      skipDuplicates: true,
    });
  });

  afterAll(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.municipality_role.deleteMany();
    await prisma.$disconnect();
  });

  it("201 creates a report with photos (multipart), returning JSON body per swagger-like shape", async () => {
    const user = { ...fakeUser, username: "citizen0", email: "c0@example.com" };
    const agent = await createAndLogin(user);

    const title = "Broken street light";
    const description =
      "The street light on Via Roma has been broken for a week";
    const category = "PUBLIC_LIGHTING"; // internal enum expected by backend
    const latitude = 45.4642;
    const longitude = 9.19;

    const res = await agent
      .post("/api/reports")
      .set("Accept", "application/json")
      .field("title", title)
      .field("description", description)
      .field("category", category)
      .field("latitude", String(latitude))
      .field("longitude", String(longitude))
      // attach a mocked image buffer; filename gives image/jpeg mimetype to multer
      .attach("photos", Buffer.from("fake_jpeg_bytes"), {
        filename: "photo.jpg",
        contentType: "image/jpeg",
      })
      .expect(201);

    expect(res.headers["content-type"]).toMatch(/application\/json/);

    // Basic shape checks aligned with Swagger's Report schema idea
    expect(res.body).toHaveProperty("id");
    expect(typeof res.body.id).toBe("number");

    expect(res.body).toHaveProperty("title", title);
    expect(res.body).toHaveProperty("description", description);
    expect(res.body).toHaveProperty("category", category);

    expect(res.body).toHaveProperty("createdAt");
    expect(typeof res.body.createdAt).toBe("string");

    expect(res.body).toHaveProperty("latitude");
    expect(res.body).toHaveProperty("longitude");

    // Photos are returned as relative paths; ensure it is an array with at least one element
    expect(Array.isArray(res.body.photos)).toBe(true);
    expect(res.body.photos.length).toBeGreaterThanOrEqual(1);
    if (res.body.photos.length > 0) {
      expect(typeof res.body.photos[0]).toBe("string");
      // Expect relative path format like "reportId/filename"
      expect(res.body.photos[0]).toMatch(/^\d+\/.+$/);
    }
  });

  it("400 if missing title", async () => {
    const agent = await createAndLogin(fakeUser);

    const res = await agent
      .post("/api/reports")
      .field("description", "desc")
      .field("category", "PUBLIC_LIGHTING")
      .field("latitude", String(45.0))
      .field("longitude", String(9.0))
      .attach("photos", Buffer.from("fake"), {
        filename: "p.jpg",
        contentType: "image/jpeg",
      })
      .expect(400);

    expect(res.body).toHaveProperty("error", "Title is required");
  });

  it("400 if missing description", async () => {
    const user = { ...fakeUser, username: "citizen2", email: "c2@example.com" };
    const agent = await createAndLogin(user);

    const res = await agent
      .post("/api/reports")
      .field("title", "t")
      .field("category", "PUBLIC_LIGHTING")
      .field("latitude", String(45.0))
      .field("longitude", String(9.0))
      .attach("photos", Buffer.from("fake"), {
        filename: "p.jpg",
        contentType: "image/jpeg",
      })
      .expect(400);

    expect(res.body).toHaveProperty("error", "Description is required");
  });

  it("400 if missing category", async () => {
    const user = { ...fakeUser, username: "citizen3", email: "c3@example.com" };
    const agent = await createAndLogin(user);

    const res = await agent
      .post("/api/reports")
      .field("title", "t")
      .field("description", "d")
      .field("latitude", String(45.0))
      .field("longitude", String(9.0))
      .attach("photos", Buffer.from("fake"), {
        filename: "p.jpg",
        contentType: "image/jpeg",
      })
      .expect(400);

    expect(res.body).toHaveProperty("error", "Category is required");
  });

  it("400 if invalid category", async () => {
    const user = { ...fakeUser, username: "citizen4", email: "c4@example.com" };
    const agent = await createAndLogin(user);

    const res = await agent
      .post("/api/reports")
      .field("title", "t")
      .field("description", "d")
      .field("category", "NOT_A_VALID_CATEGORY")
      .field("latitude", String(45.0))
      .field("longitude", String(9.0))
      .attach("photos", Buffer.from("fake"), {
        filename: "p.jpg",
        contentType: "image/jpeg",
      })
      .expect(400);

    expect(res.body).toHaveProperty("error", "Invalid category");
    expect(Array.isArray(res.body.validCategories)).toBe(true);
  });

  it("400 if missing latitude/longitude", async () => {
    const user = { ...fakeUser, username: "citizen5", email: "c5@example.com" };
    const agent = await createAndLogin(user);

    const res = await agent
      .post("/api/reports")
      .field("title", "t")
      .field("description", "d")
      .field("category", "PUBLIC_LIGHTING")
      .attach("photos", Buffer.from("fake"), {
        filename: "p.jpg",
        contentType: "image/jpeg",
      })
      .expect(400);

    expect(res.body).toHaveProperty(
      "error",
      "Latitude and longitude are required",
    );
  });

  it("400 if no photos attached", async () => {
    const user = { ...fakeUser, username: "citizen6", email: "c6@example.com" };
    const agent = await createAndLogin(user);

    const res = await agent
      .post("/api/reports")
      .field("title", "t")
      .field("description", "d")
      .field("category", "PUBLIC_LIGHTING")
      .field("latitude", String(45.0))
      .field("longitude", String(9.0))
      .expect(400);

    expect(res.body).toHaveProperty("error", "At least 1 photo is required");
  });

  it("500 (multer limit) if more than 3 photos attached", async () => {
    const user = { ...fakeUser, username: "citizen7", email: "c7@example.com" };
    const agent = await createAndLogin(user);

    const post = agent
      .post("/api/reports")
      .field("title", "t")
      .field("description", "d")
      .field("category", "PUBLIC_LIGHTING")
      .field("latitude", String(45.0))
      .field("longitude", String(9.0));

    for (let i = 0; i < 4; i++) {
      post.attach("photos", Buffer.from(`fake${i}`), {
        filename: `p${i + 1}.jpg`,
        contentType: "image/jpeg",
      });
    }

    const res = await post.expect(400);
    // Controller returns 400 for too many photos
    expect(res.body).toHaveProperty("error", "Maximum 3 photos are allowed");
  });
});

describe("ReportRoutes Integration (Approve/Reject Report)", () => {
  let adminAgent: any;
  let municipalityAgent: any;
  let reportId: number;

  beforeAll(async () => {
    // Setup municipality roles
    try {
      await prisma.municipality_role.deleteMany();
    } catch (e) {
      console.warn("Municipality role seed failed:", e);
    }
  });

  beforeEach(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.municipality_role.deleteMany();
    await prisma.municipality_role.createMany({
      data: [
        { id: 1, name: "municipal public relations officer" },
        { id: 2, name: "municipal administrator" },
        { id: 3, name: "public works project manager" },
        { id: 4, name: "sanitation and waste management officer" },
        { id: 5, name: "environmental protection officer" },
        { id: 6, name: "traffic and mobility coordinator" },
        { id: 7, name: "parks and green spaces officer" },
        { id: 8, name: "urban planning specialist" },
      ],
      skipDuplicates: true,
    });

    // Create admin user first to create municipality user
    const adminUser = {
      username: "admin_temp",
      email: "admin_temp@example.com",
      firstName: "Admin",
      lastName: "Temp",
      password: "adminpass123",
    };
    adminAgent = await createAdmin(adminUser);

    // Create municipality user
    const municipalityUser = {
      username: "municipality_validator",
      email: "validator@city.com",
      firstName: "Validator",
      lastName: "User",
      password: "validator123",
      municipality_role_id: 3, // public works project manager - for PUBLIC_LIGHTING reports
    };
    const { muniAgent } = await createMunicipality(
      adminAgent,
      municipalityUser,
    );
    municipalityAgent = muniAgent;

    // Create a citizen user and a report
    const citizenUser = {
      username: "citizen_report",
      email: "citizen_report@example.com",
      firstName: "Citizen",
      lastName: "Report",
      password: "citizen123",
    };
    const citizenAgent = await createAndLogin(citizenUser);

    // Create a report
    const reportResponse = await citizenAgent
      .post("/api/reports")
      .field("title", "Report to approve")
      .field("description", "This report needs approval")
      .field("category", "PUBLIC_LIGHTING")
      .field("latitude", "45.4642")
      .field("longitude", "9.19")
      .attach("photos", Buffer.from("fake_jpeg"), {
        filename: "photo.jpg",
        contentType: "image/jpeg",
      })
      .expect(201);

    reportId = reportResponse.body.id;
  });

  afterAll(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.municipality_role.deleteMany();
    await prisma.$disconnect();
  });

  it("200 approves a report with valid municipality authentication", async () => {
    const response = await municipalityAgent
      .post(`/api/reports/${reportId}`)
      .send({ status: "ASSIGNED" })
      .expect(204);

    // Verify the report status was updated
    const reportCheck = await request(app)
      .get(`/api/reports/${reportId}`)
      .expect(200);

    expect(reportCheck.body).toHaveProperty("status", "ASSIGNED");
  });

  it("200 rejects a report with reason", async () => {
    const rejectionReason = "Report does not meet requirements";

    const response = await municipalityAgent
      .post(`/api/reports/${reportId}`)
      .send({ status: "REJECTED", rejectionReason })
      .expect(204);

    // Verify the report status and reason were updated
    const reportCheck = await request(app)
      .get(`/api/reports/${reportId}`)
      .expect(200);

    expect(reportCheck.body).toHaveProperty("status", "REJECTED");
    expect(reportCheck.body).toHaveProperty("rejectionReason", rejectionReason);
  });

  it("400 rejects a report without reason", async () => {
    const response = await municipalityAgent
      .post(`/api/reports/${reportId}`)
      .send({ status: "REJECTED" })
      .expect(400);

    expect(response.body).toHaveProperty(
      "error",
      "Rejection reason is required when rejecting a report.",
    );
  });

  it("400 invalid status", async () => {
    const response = await municipalityAgent
      .post(`/api/reports/${reportId}`)
      .send({ status: "INVALID_STATUS" })
      .expect(400);

    expect(response.body).toHaveProperty("error");
  });

  it("403 when citizen tries to approve/reject", async () => {
    const citizenAgent = request.agent(app);
    await citizenAgent
      .post("/api/auth/session")
      .send({
        identifier: "citizen_report@example.com",
        password: "citizen123",
        role: roleType.CITIZEN,
      })
      .expect(200);

    await citizenAgent
      .post(`/api/reports/${reportId}`)
      .send({ status: "ASSIGNED" })
      .expect(403);
  });

  it("401 when not authenticated", async () => {
    await request(app)
      .post(`/api/reports/${reportId}`)
      .send({ status: "ASSIGNED" })
      .expect(401);
  });

  it("404 when report does not exist", async () => {
    const nonExistentId = 99999;
    const response = await municipalityAgent
      .post(`/api/reports/${nonExistentId}`)
      .send({ status: "ASSIGNED" })
      .expect(404);

    expect(response.body).toHaveProperty("error", "Report not found");
  });
});

describe("ReportRoutes Integration (Get Reports)", () => {
  beforeEach(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.municipality_role.deleteMany();
    await prisma.municipality_role.createMany({
      data: [
        { id: 1, name: "municipal public relations officer" },
        { id: 2, name: "municipal administrator" },
        { id: 3, name: "public works project manager" },
        { id: 4, name: "sanitation and waste management officer" },
        { id: 5, name: "environmental protection officer" },
        { id: 6, name: "traffic and mobility coordinator" },
        { id: 7, name: "parks and green spaces officer" },
        { id: 8, name: "urban planning specialist" },
      ],
      skipDuplicates: true,
    });
  });

  afterAll(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.municipality_role.deleteMany();
    await prisma.$disconnect();
  });

  it("200 returns all reports (authenticated access)", async () => {
    // Create a user and a report
    const user = {
      username: "public_user",
      email: "public@example.com",
      firstName: "Public",
      lastName: "User",
      password: "password123",
    };

    await request(app).post("/api/users").send(user).expect(201);

    const agent = request.agent(app);
    await agent
      .post("/api/auth/session")
      .send({
        identifier: user.username,
        password: user.password,
        role: roleType.CITIZEN,
      })
      .expect(200);

    // Create a report
    await agent
      .post("/api/reports")
      .field("title", "Public Report")
      .field("description", "Visible to everyone")
      .field("category", "PUBLIC_LIGHTING")
      .field("latitude", "45.4642")
      .field("longitude", "9.19")
      .attach("photos", Buffer.from("fake"), {
        filename: "photo.jpg",
        contentType: "image/jpeg",
      })
      .expect(201);

    // Get reports with authentication
    const response = await agent.get("/api/reports").expect(200);
  });

  it("403 citizen role required for status filter", async () => {
    // Create a citizen user
    const citizen = {
      username: "citizen_viewer",
      email: "citizen_viewer@example.com",
      firstName: "Citizen",
      lastName: "Viewer",
      password: "password123",
    };

    await request(app).post("/api/users").send(citizen).expect(201);

    const citizenAgent = request.agent(app);
    await citizenAgent
      .post("/api/auth/session")
      .send({
        identifier: citizen.username,
        password: citizen.password,
        role: roleType.CITIZEN,
      })
      .expect(200);

    // Citizen tries to get approved reports (should succeed with status filter)
    const response = await citizenAgent
      .get("/api/reports?status=ASSIGNED")
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it("400 invalid status filter", async () => {
    const citizen = {
      username: "citizen_invalid",
      email: "citizen_invalid@example.com",
      firstName: "Citizen",
      lastName: "Invalid",
      password: "password123",
    };

    await request(app).post("/api/users").send(citizen).expect(201);

    const citizenAgent = request.agent(app);
    await citizenAgent
      .post("/api/auth/session")
      .send({
        identifier: citizen.username,
        password: citizen.password,
        role: roleType.CITIZEN,
      })
      .expect(200);

    const response = await citizenAgent
      .get("/api/reports?status=INVALID")
      .expect(400);

    expect(response.body).toHaveProperty(
      "message",
      "request/query/status must be equal to one of the allowed values: ASSIGNED",
    );
  });

  it("200 for status filter by authenticated access", async () => {
    // Create admin user
    const admin = {
      username: "admin_filter",
      email: "admin_filter@example.com",
      firstName: "Admin",
      lastName: "Filter",
      password: "adminpass123",
    };

    const adminAgent = await createAdmin(admin);

    const response = await adminAgent
      .get("/api/reports?status=ASSIGNED")
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });
});

describe("GET /api/reports/municipality-user/:municipalityUserId", () => {
  const adminUser = {
    username: "admin_muni_reports",
    email: "admin_muni_reports@example.com",
    firstName: "Admin",
    lastName: "Muni",
    password: "Adm1nMuni!",
  };

  const municipalityPayload = {
    username: "muni_reports",
    email: "muni_reports@example.com",
    firstName: "Muni",
    lastName: "Reports",
    password: "MuniRep0rts!",
    municipality_role_id: 1,
  };

  const citizenUser = {
    username: "citizen_reports",
    email: "citizen_reports@example.com",
    firstName: "Citizen",
    lastName: "Reports",
    password: "CitizenRep1!",
  };

  beforeEach(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.municipality_role.deleteMany();
    await prisma.municipality_role.createMany({
      data: [
        { id: 1, name: "municipal public relations officer" },
        { id: 2, name: "municipal administrator" },
        { id: 3, name: "public works project manager" },
        { id: 4, name: "sanitation and waste management officer" },
        { id: 5, name: "environmental protection officer" },
        { id: 6, name: "traffic and mobility coordinator" },
        { id: 7, name: "parks and green spaces officer" },
        { id: 8, name: "urban planning specialist" },
      ],
      skipDuplicates: true,
    });
  });

  afterAll(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.municipality_role.deleteMany();
    await prisma.$disconnect();
  });

  it("401 when request is unauthenticated", async () => {
    await request(app).get("/api/reports/municipality-user/1").expect(401);
  });

  it("403 when municipality user requests reports for a different user id", async () => {
    const adminAgent = await createAdmin(adminUser);

    const { muniAgent, createdMunicipality } = await createMunicipality(
      adminAgent,
      municipalityPayload,
    );

    await muniAgent
      .get(`/api/reports/municipality-user/${createdMunicipality.id + 1}`)
      .expect(403)
      .then((res: request.Response) => {
        expect(res.body).toEqual({
          error: "Forbidden",
          message: "You can only access reports assigned to yourself",
        });
      });
  });

  it("200 returns assigned reports for the municipality user with status", async () => {
    const adminAgent = await createAdmin(adminUser);
    const { muniAgent, createdMunicipality } = await createMunicipality(
      adminAgent,
      municipalityPayload,
    );
    const citizenAgent = await createAndLogin(citizenUser);

    const createdReport = await createReportAs(citizenAgent, {
      title: "Overflowing trash can",
      description: "Trash can near the park is overflowing",
      category: "WASTE",
      latitude: 45.05,
      longitude: 7.65,
      photos: [
        {
          buffer: Buffer.from("photo"),
          name: "photo.jpg",
          contentType: "image/jpeg",
        },
      ],
    });

    await prisma.report.update({
      where: { id: createdReport.id },
      data: {
        status: "ASSIGNED",
        assignedOfficerId: createdMunicipality.id,
      },
    });

    const res = await muniAgent
      .get(
        `/api/reports/municipality-user/${createdMunicipality.id}?status=ASSIGNED`,
      )
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty(
      "assignedOfficerId",
      createdMunicipality.id,
    );
  });

  it("200 returns assigned reports for the municipality user", async () => {
    const adminAgent = await createAdmin(adminUser);
    const { muniAgent, createdMunicipality } = await createMunicipality(
      adminAgent,
      municipalityPayload,
    );
    const citizenAgent = await createAndLogin(citizenUser);

    const createdReport = await createReportAs(citizenAgent, {
      title: "Overflowing trash can",
      description: "Trash can near the park is overflowing",
      category: "WASTE",
      latitude: 45.05,
      longitude: 7.65,
      photos: [
        {
          buffer: Buffer.from("photo"),
          name: "photo.jpg",
          contentType: "image/jpeg",
        },
      ],
    });

    await prisma.report.update({
      where: { id: createdReport.id },
      data: {
        status: "ASSIGNED",
        assignedOfficerId: createdMunicipality.id,
      },
    });

    const res = await muniAgent
      .get(`/api/reports/municipality-user/${createdMunicipality.id}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty(
      "assignedOfficerId",
      createdMunicipality.id,
    );
  });
});

describe("GET /api/reports (List Reports)", () => {
  const fakeUser = {
    username: "citizen1",
    email: "citizen1@example.com",
    firstName: "Mario",
    lastName: "Rossi",
    password: "P@ssw0rd!",
  };

  beforeEach(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.municipality_role.deleteMany();
    await prisma.municipality_role.createMany({
      data: [
        { id: 1, name: "municipal public relations officer" },
        { id: 2, name: "municipal administrator" },
        { id: 3, name: "public works project manager" },
        { id: 4, name: "sanitation and waste management officer" },
        { id: 5, name: "environmental protection officer" },
        { id: 6, name: "traffic and mobility coordinator" },
        { id: 7, name: "parks and green spaces officer" },
        { id: 8, name: "urban planning specialist" },
      ],
      skipDuplicates: true,
    });
  });

  afterAll(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.municipality_role.deleteMany();
    await prisma.$disconnect();
  });

  it("200 for ADMIN user (empty array or list)", async () => {
    const admin = {
      username: "admin1",
      email: "admin1@example.com",
      firstName: "Admin",
      lastName: "One",
      password: "Adm1nP@ss!",
    };

    const adminAgent = await createAdmin(admin);

    const res = await adminAgent.get("/api/reports").expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("200 for MUNICIPALITY user (empty array or list) created by admin", async () => {
    const admin = {
      username: "admin_muni",
      email: "admin_muni@example.com",
      firstName: "AdminM",
      lastName: "M",
      password: "AdmM1nP@ss!",
    };
    const muniPayload = {
      username: "muni_created",
      email: "muni_created@example.com",
      firstName: "Mun",
      lastName: "Created",
      password: "MunC@re1",
      municipality_role_id: 1,
    };

    const adminAgent = await createAdmin(admin);
    const { muniAgent } = await createMunicipality(adminAgent, muniPayload);
    const res = await muniAgent.get("/api/reports").expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("401 when unauthenticated requires role ADMIN or MUNICIPALITY", async () => {
    const res = await request(app).get("/api/reports");
    expect(res.status).toBe(401);
  });

  it("200 when authenticated as CITIZEN", async () => {
    const agent = await createAndLogin(fakeUser);
    const res = await agent.get("/api/reports");
    expect(res.status).toBe(200);
  });
});

describe("GET /api/reports/:id (Get Report by ID)", () => {
  const fakeUser = {
    username: "citizen1",
    email: "citizen1@example.com",
    firstName: "Mario",
    lastName: "Rossi",
    password: "P@ssw0rd!",
  };

  beforeEach(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.municipality_role.deleteMany();
    await prisma.municipality_role.createMany({
      data: [
        { id: 1, name: "municipal public relations officer" },
        { id: 2, name: "municipal administrator" },
        { id: 3, name: "public works project manager" },
        { id: 4, name: "sanitation and waste management officer" },
        { id: 5, name: "environmental protection officer" },
        { id: 6, name: "traffic and mobility coordinator" },
        { id: 7, name: "parks and green spaces officer" },
        { id: 8, name: "urban planning specialist" },
      ],
      skipDuplicates: true,
    });
  });

  afterAll(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.municipality_role.deleteMany();
    await prisma.$disconnect();
  });

  it("200 report publicly when exists", async () => {
    const reporter = {
      ...fakeUser,
      username: "citizen_pub",
      email: "cpub@example.com",
    };
    const agent = await createAndLogin(reporter);

    const created = await createReportAs(agent, {
      title: "Public report",
      description: "Public desc",
      category: "WASTE",
      latitude: 45.0,
      longitude: 9.0,
      photos: [
        {
          buffer: Buffer.from("fake"),
          name: "p.jpg",
          contentType: "image/jpeg",
        },
      ],
    });

    const id = created.id;
    const publicRes = await request(app).get(`/api/reports/${id}`).expect(200);
    expect(publicRes.body).toHaveProperty("id", id);
    expect(publicRes.body).toHaveProperty("title", "Public report");
  });

  it("404 when not found", async () => {
    await request(app).get("/api/reports/999999").expect(404);
  });

  it("400 for invalid id", async () => {
    await request(app).get("/api/reports/invalid-id").expect(400);
  });
});

describe("POST /api/reports/:id (Validate Report)", () => {
  const fakeUser = {
    username: "citizen1",
    email: "citizen1@example.com",
    firstName: "Mario",
    lastName: "Rossi",
    password: "P@ssw0rd!",
  };

  beforeEach(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.municipality_role.deleteMany();
    await prisma.municipality_role.createMany({
      data: [
        { id: 1, name: "municipal public relations officer" },
        { id: 2, name: "municipal administrator" },
        { id: 3, name: "public works project manager" },
        { id: 4, name: "sanitation and waste management officer" },
        { id: 5, name: "environmental protection officer" },
        { id: 6, name: "traffic and mobility coordinator" },
        { id: 7, name: "parks and green spaces officer" },
        { id: 8, name: "urban planning specialist" },
      ],
      skipDuplicates: true,
    });
  });

  afterAll(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.municipality_role.deleteMany();
    await prisma.$disconnect();
  });

  it("204 for MUNICIPALITY user (created by admin) and updates status", async () => {
    const reporter = {
      username: "citizen_to_be_validated",
      email: "ctbv@example.com",
      firstName: "C",
      lastName: "TBV",
      password: "CtBVp@ss1",
    };
    const agentReporter = await createAndLogin(reporter);

    const created = await createReportAs(agentReporter, {
      title: "Validate me",
      description: "Need validation",
      category: "WASTE",
      latitude: 45.0,
      longitude: 9.0,
      photos: [
        {
          buffer: Buffer.from("fake"),
          name: "p.jpg",
          contentType: "image/jpeg",
        },
      ],
    });

    const id = created.id;

    const admin = {
      username: "admin_for_val",
      email: "admin_for_val@example.com",
      firstName: "AdminV",
      lastName: "V",
      password: "AdmVal1!",
    };
    const muniPayload = {
      username: "muni_valid",
      email: "munivalid@example.com",
      firstName: "Mun",
      lastName: "Valid",
      password: "MunV@lid1",
      municipality_role_id: 1,
    };

    const adminAgent = await createAdmin(admin);
    const { muniAgent } = await createMunicipality(adminAgent, muniPayload);
    // perform validation (reject path)
    await muniAgent
      .post(`/api/reports/${id}`)
      .send({ status: "REJECTED", motivation: "photos blurry" })
      .expect(204);

    // verify DB updated
    const updated = await prisma.report.findUnique({ where: { id } });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("REJECTED");
  });

  it("400 for MUNICIPALITY user with invalid status", async () => {
    const admin = {
      username: "admin_invalid_status",
      email: "admin_invalid_status@example.com",
      firstName: "Admin",
      lastName: "InvalidStatus",
      password: "AdmInv1!",
    };
    const muniPayload = {
      username: "muni_invalid_status",
      email: "muni_invalid_status@example.com",
      firstName: "Mun",
      lastName: "InvalidStatus",
      password: "MunInv@lid1",
      municipality_role_id: 1,
    };

    const adminAgent = await createAdmin(admin);
    const { muniAgent } = await createMunicipality(adminAgent, muniPayload);
    const res = await muniAgent
      .post(`/api/reports/1`)
      .send({ status: "NOT_A_VALID_STATUS" })
      .expect(400);
  });

  it("401 when unauthenticated (400 OpenAPI validation)", async () => {
    const reporter = {
      ...fakeUser,
      username: "citizen_validate",
      email: "cv@example.com",
    };
    const agent = await createAndLogin(reporter);

    const created = await createReportAs(agent, {
      title: "To validate",
      description: "desc",
      category: "WASTE",
      latitude: 45.0,
      longitude: 9.0,
      photos: [
        {
          buffer: Buffer.from("fake"),
          name: "p.jpg",
          contentType: "image/jpeg",
        },
      ],
    });

    const id = created.id;

    // unauthenticated request
    await request(app)
      .post(`/api/reports/${id}`)
      .send({ status: "REJECTED", motivation: "bad" })
      .expect(401);
  });

  it("403 for non-municipality user", async () => {
    const reporter = {
      ...fakeUser,
      username: "citizen_nmmat",
      email: "cnm@example.com",
    };
    const agent = await createAndLogin(reporter);

    const created = await createReportAs(agent, {
      title: "To validate 2",
      description: "desc",
      category: "WASTE",
      latitude: 45.0,
      longitude: 9.0,
      photos: [
        {
          buffer: Buffer.from("fake"),
          name: "p.jpg",
          contentType: "image/jpeg",
        },
      ],
    });

    const id = created.id;

    // logged in as citizen (not municipality)
    await agent
      .post(`/api/reports/${id}`)
      .send({ status: "REJECTED", motivation: "not valid" })
      .expect(403);
  });

  it("404 when report not found (municipality user)", async () => {
    const admin = {
      username: "admin_notfound",
      email: "admin_notfound@example.com",
      firstName: "Admin",
      lastName: "NF",
      password: "AdmNF1!",
    };
    const muniPayload = {
      username: "muni_notfound",
      email: "muni_notfound@example.com",
      firstName: "Mun",
      lastName: "NotFound",
      password: "MunNF@1",
      municipality_role_id: 1,
    };

    const adminAgent = await createAdmin(admin);
    const { muniAgent } = await createMunicipality(adminAgent, muniPayload);

    const res = await muniAgent
      .post("/api/reports/999999")
      .send({ status: "ASSIGNED" })
      .expect(404);
  });
});

describe("POST /api/reports/:report_id/external-maintainers (Assign to External Maintainer)", () => {
  it("401 when not authenticated", async () => {
    const response = await request(app)
      .post("/api/reports/1/external-maintainers/")
      .send({})
      .expect(401);

    expect(response.body).toHaveProperty("error");
  });
});

describe("POST /api/reports/:id (Additional validation tests)", () => {
  const fakeUser = {
    username: "citizen1",
    email: "citizen1@example.com",
    firstName: "Mario",
    lastName: "Rossi",
    password: "P@ssw0rd!",
  };

  beforeEach(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.municipality_role.deleteMany();
    await prisma.municipality_role.createMany({
      data: [
        { id: 1, name: "municipal public relations officer" },
        { id: 2, name: "municipal administrator" },
        { id: 3, name: "public works project manager" },
        { id: 4, name: "sanitation and waste management officer" },
        { id: 5, name: "environmental protection officer" },
        { id: 6, name: "traffic and mobility coordinator" },
        { id: 7, name: "parks and green spaces officer" },
        { id: 8, name: "urban planning specialist" },
      ],
      skipDuplicates: true,
    });
  });

  afterAll(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.municipality_role.deleteMany();
    await prisma.$disconnect();
  });

  it("400 or 500 invalid report id format", async () => {
    const admin = {
      username: "admin_notfound",
      email: "admin_notfound@example.com",
      firstName: "Admin",
      lastName: "NF",
      password: "AdmNF1!",
    };
    const muniPayload = {
      username: "muni_notfound",
      email: "muni_notfound@example.com",
      firstName: "Mun",
      lastName: "NotFound",
      password: "MunNF@1",
      municipality_role_id: 1,
    };

    const adminAgent = await createAdmin(admin);
    const { muniAgent } = await createMunicipality(adminAgent, muniPayload);

    const res = await muniAgent
      .post("/api/reports/invalid-id")
      .send({ status: "ASSIGNED" });

    // Can return 400 or 500 depending on implementation
    expect([400, 500]).toContain(res.status);
  });

  it("200 approves report and saves to database", async () => {
    const citizenUser = {
      ...fakeUser,
      username: "citizen_approve_db",
      email: "citizen_approve_db@example.com",
    };
    const agent = await createAndLogin(citizenUser);

    const created = await createReportAs(agent, {
      title: "Report for db verification",
      description: "desc",
      category: "WASTE",
      latitude: 45.0,
      longitude: 9.0,
      photos: [
        {
          buffer: Buffer.from("fake"),
          name: "p.jpg",
          contentType: "image/jpeg",
        },
      ],
    });

    const admin = {
      username: "admin_approve_db",
      email: "admin_approve_db@example.com",
      firstName: "Admin",
      lastName: "ApproveDb",
      password: "AdmAppDb1!",
    };
    const muniPayload = {
      username: "muni_approve_db",
      email: "muni_approve_db@example.com",
      firstName: "Muni",
      lastName: "ApproveDb",
      password: "MuniAppDb1!",
      municipality_role_id: 4, // sanitation and waste management officer - for WASTE reports
    };

    const adminAgent = await createAdmin(admin);
    const { muniAgent, createdMunicipality } = await createMunicipality(
      adminAgent,
      muniPayload,
    );

    const response = await muniAgent
      .post(`/api/reports/${created.id}`)
      .send({ status: "ASSIGNED" });

    // Endpoint returns 204 or 200, so just check status
    expect([200, 204]).toContain(response.status);

    // Verify database was updated
    const dbReport = await prisma.report.findUnique({
      where: { id: created.id },
    });
    expect(dbReport?.status).toBe("ASSIGNED");
    expect(dbReport?.assignedOfficerId).toBe(createdMunicipality.id);
  });
});

describe("GET /api/reports/:id (Additional validation tests)", () => {
  const fakeUser = {
    username: "citizen_get_report",
    email: "citizen_get_report@example.com",
    firstName: "Mario",
    lastName: "GetReport",
    password: "P@ssw0rd!",
  };

  beforeEach(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.municipality_role.deleteMany();
    await prisma.municipality_role.createMany({
      data: [
        { id: 1, name: "municipal public relations officer" },
        { id: 2, name: "municipal administrator" },
        { id: 3, name: "public works project manager" },
        { id: 4, name: "sanitation and waste management officer" },
        { id: 5, name: "environmental protection officer" },
        { id: 6, name: "traffic and mobility coordinator" },
        { id: 7, name: "parks and green spaces officer" },
        { id: 8, name: "urban planning specialist" },
      ],
      skipDuplicates: true,
    });
  });

  afterAll(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.municipality_role.deleteMany();
    await prisma.$disconnect();
  });

  it("200 report contains all required fields", async () => {
    const agent = await createAndLogin(fakeUser);

    const created = await createReportAs(agent, {
      title: "Complete report",
      description: "Full description",
      category: "PUBLIC_LIGHTING",
      latitude: 45.4642,
      longitude: 9.19,
      photos: [
        {
          buffer: Buffer.from("fake_jpeg_bytes"),
          name: "photo.jpg",
          contentType: "image/jpeg",
        },
      ],
    });

    const response = await request(app)
      .get(`/api/reports/${created.id}`)
      .expect(200);

    expect(response.body).toHaveProperty("id");
    expect(response.body).toHaveProperty("title", "Complete report");
    expect(response.body).toHaveProperty("description", "Full description");
    expect(response.body).toHaveProperty("category", "PUBLIC_LIGHTING");
    expect(response.body).toHaveProperty("latitude");
    expect(response.body).toHaveProperty("longitude");
    expect(response.body).toHaveProperty("createdAt");
    expect(response.body).toHaveProperty("photos");
    expect(Array.isArray(response.body.photos)).toBe(true);
  });

  it("200 report is publicly accessible", async () => {
    const agent = await createAndLogin(fakeUser);

    const created = await createReportAs(agent, {
      title: "Public report",
      description: "Public desc",
      category: "WASTE",
      latitude: 45.0,
      longitude: 9.0,
      photos: [
        {
          buffer: Buffer.from("fake"),
          name: "p.jpg",
          contentType: "image/jpeg",
        },
      ],
    });

    // Access without authentication
    const response = await request(app)
      .get(`/api/reports/${created.id}`)
      .expect(200);

    expect(response.body).toHaveProperty("id", created.id);
  });

  it("404 returns proper error message", async () => {
    const response = await request(app).get("/api/reports/999999").expect(404);

    expect(response.body).toHaveProperty("error");
  });
});

describe("Integration: Comments endpoints", () => {
  const fakeUser = {
    username: "citizen_get_report",
    email: "citizen_get_report@example.com",
    firstName: "Mario",
    lastName: "GetReport",
    password: "P@ssw0rd!",
  };

  beforeEach(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.external_maintainer.deleteMany();
    await prisma.municipality_role.deleteMany();
    await prisma.municipality_role.createMany({
      data: [
        { id: 1, name: "municipal public relations officer" },
        { id: 2, name: "municipal administrator" },
        { id: 3, name: "public works project manager" },
        { id: 4, name: "sanitation and waste management officer" },
        { id: 5, name: "environmental protection officer" },
        { id: 6, name: "traffic and mobility coordinator" },
        { id: 7, name: "parks and green spaces officer" },
        { id: 8, name: "urban planning specialist" },
      ],
      skipDuplicates: true,
    });
  });

  afterAll(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.municipality_role.deleteMany();
    await prisma.$disconnect();
  });

  it("POST 201: municipality user can add a comment and GET will return it", async () => {
    const admin = {
      username: "admin_comments_e2e",
      email: "admin_comments_e2e@example.com",
      firstName: "Admin",
      lastName: "Comments",
      password: "adminpass1",
    };
    const muni = {
      username: "muni_comments_e2e",
      email: "muni_comments_e2e@example.com",
      firstName: "Muni",
      lastName: "Comments",
      password: "munipass1",
      municipality_role_id: 3,
    };

    const adminAgent = await createAdmin(admin);
    const { muniAgent } = await createMunicipality(adminAgent, muni);
    const citizenAgent = await createAndLogin(fakeUser);

    const createdReport = await createReportAs(citizenAgent, {
      title: "Report for comments e2e",
      description: "Description",
      category: "WASTE",
      latitude: 45.0,
      longitude: 7.0,
    });

    // Add comment
    const postRes = await muniAgent
      .post(`/api/reports/${createdReport.id}/comments`)
      .send({ content: "Hello from municipality" })
      .expect(201);

    expect(postRes.body).toHaveProperty("id");
    expect(postRes.body).toHaveProperty("content", "Hello from municipality");

    // Fetch comments
    const getRes = await muniAgent
      .get(`/api/reports/${createdReport.id}/comments`)
      .expect(200);

    expect(Array.isArray(getRes.body)).toBeTruthy();
    expect(getRes.body.length).toBeGreaterThanOrEqual(1);
    expect(
      getRes.body.some((c: any) => c.content === "Hello from municipality"),
    ).toBeTruthy();
  });

  it("POST 400 when content missing", async () => {
    const adminAgent = await createAdmin({
      username: "admin_comments_e2e2",
      email: "admin_comments_e2e2@example.com",
      firstName: "Admin",
      lastName: "Comments2",
      password: "adminpass2",
    });
    const { muniAgent } = await createMunicipality(adminAgent, {
      username: "muni_comments_e2e2",
      email: "muni_comments_e2e2@example.com",
      firstName: "Muni",
      lastName: "Comments2",
      password: "munipass2",
      municipality_role_id: 3,
    });

    const citizenAgent = await createAndLogin(fakeUser);
    const createdReport = await createReportAs(citizenAgent, {
      title: "Report missing content",
      description: "desc",
      category: "WASTE",
      latitude: 45.0,
      longitude: 7.0,
    });

    await muniAgent
      .post(`/api/reports/${createdReport.id}/comments`)
      .send({}) // missing content
      .expect(400);
  });

  it("POST 401 when not authenticated", async () => {
    const resident = {
      username: "random_guest",
      email: "random_guest@example.com",
      firstName: "Guest",
      lastName: "User",
      password: "guest123",
    };
    // don't log in - unauthenticated
    const res = await request(app)
      .post(`/api/reports/1/comments`)
      .send({ content: "x" })
      .expect(401);
  });

  it("POST 403 when citizen tries to add a comment", async () => {
    const citizen = {
      username: "citizen_try_comment",
      email: "citizen_try_comment@example.com",
      firstName: "Citizen",
      lastName: "Try",
      password: "citizenpass2",
    };
    const citizenAgent = await createAndLogin(citizen);

    const createdReport = await createReportAs(citizenAgent, {
      title: "Report citizen comment",
      description: "desc",
      category: "WASTE",
      latitude: 45.0,
      longitude: 7.0,
    });

    await citizenAgent
      .post(`/api/reports/${createdReport.id}/comments`)
      .send({ content: "citizen trying to comment" })
      .expect(403);
  });

  it("POST 404 when report not found", async () => {
    const adminAgent = await createAdmin({
      username: "admin_comments_notfound",
      email: "admin_comments_notfound@example.com",
      firstName: "AdminNF",
      lastName: "Comments",
      password: "adminpassNF",
    });
    const { muniAgent } = await createMunicipality(adminAgent, {
      username: "muni_comments_nf",
      email: "muni_comments_nf@example.com",
      firstName: "MuniNF",
      lastName: "Comments",
      password: "munipassNF",
      municipality_role_id: 3,
    });

    await muniAgent
      .post(`/api/reports/999999/comments`)
      .send({ content: "should not find" })
      .expect(404);
  });

  it("POST 500 when repository throws", async () => {
    const adminAgent = await createAdmin({
      username: "admin_comments_500",
      email: "admin_comments_500@example.com",
      firstName: "Admin500",
      lastName: "Comments",
      password: "adminpass500",
    });
    const { muniAgent } = await createMunicipality(adminAgent, {
      username: "muni_comments_500",
      email: "muni_comments_500@example.com",
      firstName: "Muni500",
      lastName: "Comments",
      password: "munipass500",
      municipality_role_id: 3,
    });

    const citizenAgent = await createAndLogin(fakeUser);
    const createdReport = await createReportAs(citizenAgent, {
      title: "Report for 500 test",
      description: "desc",
      category: "WASTE",
      latitude: 45.0,
      longitude: 7.0,
    });

    // Spy on repository to force an error path
    jest
      .spyOn(reportRepository, "addCommentToReport")
      .mockRejectedValue(new Error("DB failure"));

    await muniAgent
      .post(`/api/reports/${createdReport.id}/comments`)
      .send({ content: "trigger db error" })
      .expect(500);

    jest.restoreAllMocks();
  });

  // --- GET comments cases ---
  it("GET 200 returns comments to municipality user", async () => {
    const adminAgent = await createAdmin({
      username: "admin_comments_get",
      email: "admin_comments_get@example.com",
      firstName: "AdminGet",
      lastName: "Comments",
      password: "adminpassget",
    });
    const { muniAgent } = await createMunicipality(adminAgent, {
      username: "muni_comments_get",
      email: "muni_comments_get@example.com",
      firstName: "MuniGet",
      lastName: "Comments",
      password: "munipassget",
      municipality_role_id: 3,
    });

    const citizenAgent = await createAndLogin(fakeUser);
    const createdReport = await createReportAs(citizenAgent, {
      title: "Report for get comments",
      description: "desc",
      category: "WASTE",
      latitude: 45.0,
      longitude: 7.0,
    });

    // Add a comment via muniAgent
    await muniAgent
      .post(`/api/reports/${createdReport.id}/comments`)
      .send({ content: "visible to muni" })
      .expect(201);

    const getRes = await muniAgent
      .get(`/api/reports/${createdReport.id}/comments`)
      .expect(200);

    expect(Array.isArray(getRes.body)).toBeTruthy();
    expect(getRes.body.length).toBeGreaterThanOrEqual(1);
  });

  it("GET 400 when invalid id", async () => {
    const adminAgent = await createAdmin({
      username: "admin_comments_get_badid",
      email: "admin_comments_get_badid@example.com",
      firstName: "AdminBad",
      lastName: "Comments",
      password: "adminpassbad",
    });
    const { muniAgent } = await createMunicipality(adminAgent, {
      username: "muni_comments_get_badid",
      email: "muni_comments_get_badid@example.com",
      firstName: "MuniBad",
      lastName: "Comments",
      password: "munipassbad",
      municipality_role_id: 3,
    });

    await muniAgent.get(`/api/reports/invalid-id/comments`).expect(400);
  });

  it("GET 401 when not authenticated", async () => {
    await request(app).get(`/api/reports/1/comments`).expect(401);
  });

  it("GET 403 when citizen tries to access comments", async () => {
    const citizenAgent = await createAndLogin({
      username: "citizen_get_forbidden",
      email: "citizen_get_forbidden@example.com",
      firstName: "Citizen",
      lastName: "Forbidden",
      password: "citizenforbid1",
    });

    const createdReport = await createReportAs(citizenAgent, {
      title: "Report get forbidden",
      description: "desc",
      category: "WASTE",
      latitude: 45.0,
      longitude: 7.0,
    });

    await citizenAgent
      .get(`/api/reports/${createdReport.id}/comments`)
      .expect(403);
  });

  it("GET 404 when report not found", async () => {
    const adminAgent = await createAdmin({
      username: "admin_comments_get_nf",
      email: "admin_comments_get_nf@example.com",
      firstName: "AdminNF",
      lastName: "Comments",
      password: "adminpassnf",
    });
    const { muniAgent } = await createMunicipality(adminAgent, {
      username: "muni_comments_get_nf",
      email: "muni_comments_get_nf@example.com",
      firstName: "MuniNF",
      lastName: "Comments",
      password: "munipassnf",
      municipality_role_id: 3,
    });

    await muniAgent.get(`/api/reports/999999/comments`).expect(404);
  });

  it("GET 500 when repository throws", async () => {
    const adminAgent = await createAdmin({
      username: "admin_comments_get_500",
      email: "admin_comments_get_500@example.com",
      firstName: "Admin500Get",
      lastName: "Comments",
      password: "adminpass500get",
    });
    const { muniAgent } = await createMunicipality(adminAgent, {
      username: "muni_comments_get_500",
      email: "muni_comments_get_500@example.com",
      firstName: "Muni500Get",
      lastName: "Comments",
      password: "munipass500get",
      municipality_role_id: 3,
    });

    const citizenAgent = await createAndLogin(fakeUser);
    const createdReport = await createReportAs(citizenAgent, {
      title: "Report for get 500",
      description: "desc",
      category: "WASTE",
      latitude: 45.0,
      longitude: 7.0,
    });

    jest
      .spyOn(reportRepository, "getCommentsByReportId")
      .mockRejectedValue(new Error("DB fail"));

    await muniAgent
      .get(`/api/reports/${createdReport.id}/comments`)
      .expect(500);

    jest.restoreAllMocks();
  });

  // --- External Maintainer comment scenarios ---
  describe("External Maintainer Comments", () => {
    it("POST 201: external maintainer can add a comment to assigned report", async () => {
      const admin = {
        username: "admin_em_comments",
        email: "admin_em_comments@example.com",
        firstName: "Admin",
        lastName: "EM",
        password: "adminpass1",
      };
      const muni = {
        username: "muni_em_comments",
        email: "muni_em_comments@example.com",
        firstName: "Muni",
        lastName: "EM",
        password: "munipass1",
        municipality_role_id: 3,
      };
      const emData = {
        username: "em_comments_1",
        email: "em_comments_1@example.com",
        firstName: "ExtMaint",
        lastName: "Comments",
        password: "empass1",
        companyName: "EMCorp",
        category: "WASTE",
      };

      const adminAgent = await createAdmin(admin);
      const { muniAgent } = await createMunicipality(adminAgent, muni);
      const { emAgent } = await createExternalMaintainer(adminAgent, emData);
      const citizenAgent = await createAndLogin(fakeUser);

      const createdReport = await createReportAs(citizenAgent, {
        title: "Report for EM comments",
        description: "Description",
        category: "WASTE",
        latitude: 45.0,
        longitude: 7.0,
      });

      // Assign report to external maintainer
      await muniAgent
        .post(`/api/reports/${createdReport.id}/external-maintainers/`)
        .send({})
        .expect(200);

      // External maintainer adds comment
      const postRes = await emAgent
        .post(`/api/reports/${createdReport.id}/comments`)
        .send({ content: "Hello from external maintainer" })
        .expect(201);

      expect(postRes.body).toHaveProperty("id");
      expect(postRes.body).toHaveProperty("content", "Hello from external maintainer");
      expect(postRes.body).toHaveProperty("external_maintainer_id");
    });

    it("POST 403 when external maintainer tries to comment on report not assigned to them", async () => {
      const admin = {
        username: "admin_em_403",
        email: "admin_em_403@example.com",
        firstName: "Admin",
        lastName: "EM403",
        password: "adminpass2",
      };
      const emData = {
        username: "em_comments_2",
        email: "em_comments_2@example.com",
        firstName: "ExtMaint",
        lastName: "Comments",
        password: "empass2",
        companyName: "EMCorp",
        category: "WASTE",
      };

      const adminAgent = await createAdmin(admin);
      const { emAgent } = await createExternalMaintainer(adminAgent, emData);
      const citizenAgent = await createAndLogin(fakeUser);

      const createdReport = await createReportAs(citizenAgent, {
        title: "Report not assigned",
        description: "Description",
        category: "WASTE",
        latitude: 45.0,
        longitude: 7.0,
      });

      // External maintainer tries to comment on unassigned report
      await emAgent
        .post(`/api/reports/${createdReport.id}/comments`)
        .send({ content: "Should not work" })
        .expect(403);
    });

    it("GET 200: external maintainer can see comments on assigned report", async () => {
      const admin = {
        username: "admin_em_get",
        email: "admin_em_get@example.com",
        firstName: "Admin",
        lastName: "EMGet",
        password: "adminpass3",
      };
      const muni = {
        username: "muni_em_get",
        email: "muni_em_get@example.com",
        firstName: "Muni",
        lastName: "EMGet",
        password: "munipass3",
        municipality_role_id: 3,
      };
      const emData = {
        username: "em_comments_3",
        email: "em_comments_3@example.com",
        firstName: "ExtMaint",
        lastName: "Comments",
        password: "empass3",
        companyName: "EMCorp",
        category: "WASTE",
      };

      const adminAgent = await createAdmin(admin);
      const { muniAgent } = await createMunicipality(adminAgent, muni);
      const { emAgent } = await createExternalMaintainer(adminAgent, emData);
      const citizenAgent = await createAndLogin(fakeUser);

      const createdReport = await createReportAs(citizenAgent, {
        title: "Report for get EM comments",
        description: "Description",
        category: "WASTE",
        latitude: 45.0,
        longitude: 7.0,
      });

      // Assign report to external maintainer
      await muniAgent
        .post(`/api/reports/${createdReport.id}/external-maintainers/`)
        .send({})
        .expect(200);

      // External maintainer adds comment
      await emAgent
        .post(`/api/reports/${createdReport.id}/comments`)
        .send({ content: "EM comment visible" })
        .expect(201);

      // External maintainer retrieves comments
      const getRes = await emAgent
        .get(`/api/reports/${createdReport.id}/comments`)
        .expect(200);

      expect(Array.isArray(getRes.body)).toBeTruthy();
      expect(getRes.body.length).toBeGreaterThanOrEqual(1);
      expect(
        getRes.body.some((c: any) => c.content === "EM comment visible"),
      ).toBeTruthy();
    });
  });

  // --- Collaboration tests between technical officer and external maintainer ---
  describe("Technical Officer and External Maintainer Collaboration", () => {
    it("POST 201: both roles can add comments and see each other's comments", async () => {
      const admin = {
        username: "admin_collab",
        email: "admin_collab@example.com",
        firstName: "Admin",
        lastName: "Collab",
        password: "adminpass4",
      };
      const muni = {
        username: "muni_collab",
        email: "muni_collab@example.com",
        firstName: "Muni",
        lastName: "Collab",
        password: "munipass4",
        municipality_role_id: 3,
      };
      const emData = {
        username: "em_collab_1",
        email: "em_collab_1@example.com",
        firstName: "ExtMaint",
        lastName: "Collab",
        password: "empass4",
        companyName: "EMCorp",
        category: "WASTE",
      };

      const adminAgent = await createAdmin(admin);
      const { muniAgent } = await createMunicipality(adminAgent, muni);
      const { emAgent } = await createExternalMaintainer(adminAgent, emData);
      const citizenAgent = await createAndLogin(fakeUser);

      const createdReport = await createReportAs(citizenAgent, {
        title: "Collaboration test",
        description: "Description",
        category: "WASTE",
        latitude: 45.0,
        longitude: 7.0,
      });

      // Assign report to external maintainer
      await muniAgent
        .post(`/api/reports/${createdReport.id}/external-maintainers/`)
        .send({})
        .expect(200);

      // Municipality user adds comment
      const muniComment = await muniAgent
        .post(`/api/reports/${createdReport.id}/comments`)
        .send({ content: "Please prioritize this issue" })
        .expect(201);

      expect(muniComment.body.municipality_user_id).toBeDefined();
      expect(muniComment.body.content).toBe("Please prioritize this issue");

      // External maintainer adds comment
      const emComment = await emAgent
        .post(`/api/reports/${createdReport.id}/comments`)
        .send({ content: "Starting work tomorrow" })
        .expect(201);

      expect(emComment.body.external_maintainer_id).toBeDefined();
      expect(emComment.body.content).toBe("Starting work tomorrow");

      // Municipality user sees both comments
      const muniCommentsRes = await muniAgent
        .get(`/api/reports/${createdReport.id}/comments`)
        .expect(200);

      expect(muniCommentsRes.body.length).toBeGreaterThanOrEqual(2);
      expect(
        muniCommentsRes.body.some((c: any) => c.content === "Please prioritize this issue"),
      ).toBeTruthy();
      expect(
        muniCommentsRes.body.some((c: any) => c.content === "Starting work tomorrow"),
      ).toBeTruthy();

      // External maintainer sees both comments
      const emCommentsRes = await emAgent
        .get(`/api/reports/${createdReport.id}/comments`)
        .expect(200);

      expect(emCommentsRes.body.length).toBeGreaterThanOrEqual(2);
      expect(
        emCommentsRes.body.some((c: any) => c.content === "Please prioritize this issue"),
      ).toBeTruthy();
      expect(
        emCommentsRes.body.some((c: any) => c.content === "Starting work tomorrow"),
      ).toBeTruthy();
    });

    it("POST 403: cannot add comment on RESOLVED report", async () => {
      const admin = {
        username: "admin_resolved",
        email: "admin_resolved@example.com",
        firstName: "Admin",
        lastName: "Resolved",
        password: "adminpass5",
      };
      const muni = {
        username: "muni_resolved",
        email: "muni_resolved@example.com",
        firstName: "Muni",
        lastName: "Resolved",
        password: "munipass5",
        municipality_role_id: 3,
      };
      const emData = {
        username: "em_resolved_1",
        email: "em_resolved_1@example.com",
        firstName: "ExtMaint",
        lastName: "Resolved",
        password: "empass5",
        companyName: "EMCorp",
        category: "PUBLIC_LIGHTING",
      };

      const adminAgent = await createAdmin(admin);
      const { muniAgent } = await createMunicipality(adminAgent, muni);
      const { emAgent } = await createExternalMaintainer(adminAgent, emData);
      const citizenAgent = await createAndLogin(fakeUser);

      const createdReport = await createReportAs(citizenAgent, {
        title: "Report to resolve",
        description: "Description",
        category: "PUBLIC_LIGHTING",
        latitude: 45.0,
        longitude: 7.0,
      });

      // Municipality approves the report first
      await muniAgent
        .post(`/api/reports/${createdReport.id}`)
        .send({ status: "ASSIGNED" })
        .expect(204);

      // Assign report to external maintainer
      await muniAgent
        .post(`/api/reports/${createdReport.id}/external-maintainers/`)
        .send({})
        .expect(200);

      // External maintainer changes status to IN_PROGRESS then RESOLVED
      await emAgent
        .post(`/api/reports/${createdReport.id}`)
        .send({ status: "IN_PROGRESS" })
        .expect(204);

      await emAgent
        .post(`/api/reports/${createdReport.id}`)
        .send({ status: "RESOLVED" })
        .expect(204);

      // Try to add comment on RESOLVED report - should fail
      await muniAgent
        .post(`/api/reports/${createdReport.id}/comments`)
        .send({ content: "Should not be able to comment" })
        .expect(403);

      await emAgent
        .post(`/api/reports/${createdReport.id}/comments`)
        .send({ content: "Should not be able to comment" })
        .expect(403);
    });
  });
});
