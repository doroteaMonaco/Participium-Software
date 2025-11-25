import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "@app";

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

describe("ReportRoutes Integration (Create Report)", () => {
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
  });

  afterAll(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it("201 creates a report with photos (multipart), returning JSON body per swagger-like shape", async () => {
    const agent = request.agent(app);

    // Register and login to simulate authenticated flow
    await agent.post("/api/users").send(fakeUser).expect(201);
    await agent
      .post("/api/auth/session")
      .send({ identifier: fakeUser.username, password: fakeUser.password })
      .expect(200);

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
    const agent = request.agent(app);
    await agent.post("/api/users").send(fakeUser).expect(201);
    await agent
      .post("/api/auth/session")
      .send({ identifier: fakeUser.username, password: fakeUser.password })
      .expect(200);

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
    const agent = request.agent(app);
    await agent
      .post("/api/users")
      .send({ ...fakeUser, username: "citizen2", email: "c2@example.com" })
      .expect(201);
    await agent
      .post("/api/auth/session")
      .send({ identifier: "citizen2", password: fakeUser.password })
      .expect(200);

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
    const agent = request.agent(app);
    await agent
      .post("/api/users")
      .send({ ...fakeUser, username: "citizen3", email: "c3@example.com" })
      .expect(201);
    await agent
      .post("/api/auth/session")
      .send({ identifier: "citizen3", password: fakeUser.password })
      .expect(200);

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
    const agent = request.agent(app);
    await agent
      .post("/api/users")
      .send({ ...fakeUser, username: "citizen4", email: "c4@example.com" })
      .expect(201);
    await agent
      .post("/api/auth/session")
      .send({ identifier: "citizen4", password: fakeUser.password })
      .expect(200);

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
    const agent = request.agent(app);
    await agent
      .post("/api/users")
      .send({ ...fakeUser, username: "citizen5", email: "c5@example.com" })
      .expect(201);
    await agent
      .post("/api/auth/session")
      .send({ identifier: "citizen5", password: fakeUser.password })
      .expect(200);

    const res = await agent
      .post("/api/reports")
      .field("title", "t")
      .field("description", "d")
      .field("category", "PUBLIC_LIGHTING")
      // no latitude/longitude
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
    const agent = request.agent(app);
    await agent
      .post("/api/users")
      .send({ ...fakeUser, username: "citizen6", email: "c6@example.com" })
      .expect(201);
    await agent
      .post("/api/auth/session")
      .send({ identifier: "citizen6", password: fakeUser.password })
      .expect(200);

    const res = await agent
      .post("/api/reports")
      .field("title", "t")
      .field("description", "d")
      .field("category", "PUBLIC_LIGHTING")
      .field("latitude", String(45.0))
      .field("longitude", String(9.0))
      // no photos
      .expect(400);

    expect(res.body).toHaveProperty("error", "At least 1 photo is required");
  });

  it("500 (multer limit) if more than 3 photos attached", async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/users")
      .send({ ...fakeUser, username: "citizen7", email: "c7@example.com" })
      .expect(201);
    await agent
      .post("/api/auth/session")
      .send({ identifier: "citizen7", password: fakeUser.password })
      .expect(200);

    const post = agent
      .post("/api/reports")
      .field("title", "t")
      .field("description", "d")
      .field("category", "PUBLIC_LIGHTING")
      .field("latitude", String(45.0))
      .field("longitude", String(9.0));

    // attach 4 images (limit is 3)
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
  let municipalityAgent: any;
  let reportId: number;

  beforeAll(async () => {
    // Setup municipality roles
    try {
      await prisma.municipality_role.createMany({
        data: [
          { id: 1, name: "OPERATOR" },
          { id: 2, name: "VALIDATOR" },
          { id: 3, name: "SUPERVISOR" },
        ],
        skipDuplicates: true,
      });
    } catch (e) {
      console.warn("Municipality role seed failed:", e);
    }
  });

  beforeEach(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();

    // Create municipality user
    const municipalityUser = {
      username: "municipality_validator",
      email: "validator@city.com",
      firstName: "Validator",
      lastName: "User",
      password: "validator123",
      municipality_role_id: 2,
    };

    municipalityAgent = request.agent(app);

    // Create admin user first to create municipality user
    const adminUser = {
      username: "admin_temp",
      email: "admin_temp@example.com",
      firstName: "Admin",
      lastName: "Temp",
      password: "adminpass123",
    };

    await municipalityAgent.post("/api/users").send(adminUser).expect(201);
    await prisma.user.update({
      where: { email: adminUser.email },
      data: { role: "ADMIN" },
    });

    // Login admin
    await municipalityAgent
      .post("/api/auth/session")
      .send({ identifier: adminUser.email, password: adminUser.password })
      .expect(200);

    // Create municipality user
    await municipalityAgent
      .post("/api/users/municipality-users")
      .send(municipalityUser)
      .expect(201);

    // Login as municipality user
    municipalityAgent = request.agent(app);
    await municipalityAgent
      .post("/api/auth/session")
      .send({ identifier: municipalityUser.email, password: municipalityUser.password })
      .expect(200);

    // Create a citizen user and a report
    const citizenUser = {
      username: "citizen_report",
      email: "citizen_report@example.com",
      firstName: "Citizen",
      lastName: "Report",
      password: "citizen123",
    };

    await request(app).post("/api/users").send(citizenUser).expect(201);

    const citizenAgent = request.agent(app);
    await citizenAgent
      .post("/api/auth/session")
      .send({ identifier: citizenUser.email, password: citizenUser.password })
      .expect(200);

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
    await prisma.$disconnect();
  });

  it("200 approves a report with valid municipality authentication", async () => {
    const response = await municipalityAgent
      .post(`/api/reports/${reportId}`)
      .send({ status: "ASSIGNED" })
      .expect(200);

    expect(response.body).toHaveProperty("status", "ASSIGNED");

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
      .expect(200);

    expect(response.body).toHaveProperty("status", "REJECTED");

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

    expect(response.body).toHaveProperty("error", "Rejection reason is required when rejecting a report.");
  });

  it("400 invalid status", async () => {
    const response = await municipalityAgent
      .post(`/api/reports/${reportId}`)
      .send({ status: "INVALID_STATUS" })
      .expect(400);

    expect(response.body).toHaveProperty("error", "Validation Error");
  });

  it("403 when citizen tries to approve/reject", async () => {
    const citizenAgent = request.agent(app);
    await citizenAgent
      .post("/api/auth/session")
      .send({ identifier: "citizen_report@example.com", password: "citizen123" })
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
  });

  afterAll(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it("200 returns all reports (public access)", async () => {
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
      .send({ identifier: user.username, password: user.password })
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

    // Get reports without authentication (public access)
    const response = await request(app).get("/api/reports").expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
    expect(response.body[0]).toHaveProperty("title", "Public Report");
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
      .send({ identifier: citizen.username, password: citizen.password })
      .expect(200);

    // Citizen tries to get approved reports (should get 403 since role check fails)
    const response = await citizenAgent
      .get("/api/reports?status=ASSIGNED")
      .expect(403);

    expect(response.body).toHaveProperty("error", "Authorization Error");
    expect(response.body.message).toBe("Access denied. Citizen role required to filter by status.");
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
      .send({ identifier: citizen.username, password: citizen.password })
      .expect(200);

    const response = await citizenAgent
      .get("/api/reports?status=INVALID")
      .expect(400);

    expect(response.body).toHaveProperty("message", "request/query/status must be equal to one of the allowed values: ASSIGNED");
  });  it("403 citizen role required for status filter by non-citizens", async () => {
    // Create admin user
    const admin = {
      username: "admin_filter",
      email: "admin_filter@example.com",
      firstName: "Admin",
      lastName: "Filter",
      password: "adminpass123",
    };

    await request(app).post("/api/users").send(admin).expect(201);
    await prisma.user.update({
      where: { email: admin.email },
      data: { role: "ADMIN" },
    });

    const adminAgent = request.agent(app);
    await adminAgent
      .post("/api/auth/session")
      .send({ identifier: admin.username, password: admin.password })
      .expect(200);

    const response = await adminAgent
      .get("/api/reports?status=ASSIGNED")
      .expect(403);

    expect(response.body).toHaveProperty("error", "Authorization Error");
    expect(response.body.message).toBe("Access denied. Citizen role required to filter by status.");
  });
});
