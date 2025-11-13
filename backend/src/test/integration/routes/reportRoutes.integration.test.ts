import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "../../../app";

// Mock only the image service to avoid dealing with real Redis/FS in this e2e
jest.mock("../../../services/imageService", () => {
  return {
    __esModule: true,
    default: {
      storeTemporaryImages: jest.fn(async (images: any[]) =>
        images.map((_: any, i: number) => `temp:image:key-${i + 1}`),
      ),
      persistImagesForReport: jest.fn(async (keys: string[], reportId: number) =>
        keys.map((_: string, i: number) => `${reportId}/${reportId}_${i + 1}.jpg`),
      ),
      getMultipleImages: jest.fn(async (paths: string[]) =>
        paths.map((_: string, i: number) => `data:image/jpeg;base64,ZmFrZV9pbWFnZV8${i}`),
      ),
      getImageUrl: jest.fn((rel: string) => `/uploads/${rel}`),
      getMultipleImageUrls: jest.fn((rels: string[]) => rels.map((r) => `/uploads/${r}`)),
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
    const description = "The street light on Via Roma has been broken for a week";
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

    // Photos are mocked to return data URLs; ensure it is an array with at least one element
    expect(Array.isArray(res.body.photos)).toBe(true);
    expect(res.body.photos.length).toBeGreaterThanOrEqual(1);
    if (res.body.photos.length > 0) {
      expect(typeof res.body.photos[0]).toBe("string");
      expect(res.body.photos[0]).toMatch(/^data:image\//);
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
      .attach("photos", Buffer.from("fake"), { filename: "p.jpg", contentType: "image/jpeg" })
      .expect(400);

    expect(res.body).toHaveProperty("error", "Title is required");
  });

  it("400 if missing description", async () => {
    const agent = request.agent(app);
    await agent.post("/api/users").send({ ...fakeUser, username: "citizen2", email: "c2@example.com" }).expect(201);
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
      .attach("photos", Buffer.from("fake"), { filename: "p.jpg", contentType: "image/jpeg" })
      .expect(400);

    expect(res.body).toHaveProperty("error", "Description is required");
  });

  it("400 if missing category", async () => {
    const agent = request.agent(app);
    await agent.post("/api/users").send({ ...fakeUser, username: "citizen3", email: "c3@example.com" }).expect(201);
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
      .attach("photos", Buffer.from("fake"), { filename: "p.jpg", contentType: "image/jpeg" })
      .expect(400);

    expect(res.body).toHaveProperty("error", "Category is required");
  });

  it("400 if invalid category", async () => {
    const agent = request.agent(app);
    await agent.post("/api/users").send({ ...fakeUser, username: "citizen4", email: "c4@example.com" }).expect(201);
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
      .attach("photos", Buffer.from("fake"), { filename: "p.jpg", contentType: "image/jpeg" })
      .expect(400);

    expect(res.body).toHaveProperty("error", "Invalid category");
    expect(Array.isArray(res.body.validCategories)).toBe(true);
  });

  it("400 if missing latitude/longitude", async () => {
    const agent = request.agent(app);
    await agent.post("/api/users").send({ ...fakeUser, username: "citizen5", email: "c5@example.com" }).expect(201);
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
      .attach("photos", Buffer.from("fake"), { filename: "p.jpg", contentType: "image/jpeg" })
      .expect(400);

    expect(res.body).toHaveProperty("error", "Latitude and longitude are required");
  });

  it("400 if no photos attached", async () => {
    const agent = request.agent(app);
    await agent.post("/api/users").send({ ...fakeUser, username: "citizen6", email: "c6@example.com" }).expect(201);
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
    await agent.post("/api/users").send({ ...fakeUser, username: "citizen7", email: "c7@example.com" }).expect(201);
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

    const res = await post.expect(500);
    // Global error handler returns a generic 500 for multer LIMIT_FILE_COUNT
    expect(res.body).toHaveProperty("error", "Internal Server Error");
  });
});
