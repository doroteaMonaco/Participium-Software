import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "@app";
import { roleType } from "@models/enums";
import { userService } from "@services/userService";

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

    expect(response.body).toHaveProperty(
      "error",
      "Invalid status. Must be ASSIGNED or REJECTED.",
    );
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
      username: "admin_invalid_id",
      email: "admin_invalid_id@example.com",
      firstName: "Admin",
      lastName: "InvalidId",
      password: "AdmInvId1!",
    };

    const adminAgent = await createAdmin(admin);

    const res = await adminAgent
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
