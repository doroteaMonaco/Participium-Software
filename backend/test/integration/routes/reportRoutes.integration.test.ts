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

// --- Helpers: register, login, create/admin->municipality, create report ---
const registerUser = async (agent: request.SuperAgentTest, user: any) => {
  const res = await agent.post("/api/users").send(user);
  expect(res.status).toBe(201);
};
const loginAgent = async (
  agent: request.SuperAgentTest,
  identifier: string,
  password: string,
) => {
  const res = await agent
    .post("/api/auth/session")
    .send({ identifier, password });
  expect(res.status).toBe(200);
};

const createAndLogin = async (user: any) => {
  const agent: any = request.agent(app);

  await registerUser(agent, user);
  await loginAgent(agent, user.username, user.password);
  return agent;
};

// Create an admin account and then use admin to create a municipality user.
// Returns an agent logged in as the municipality user.
const createAdminAndCreateMunicipality = async (
  admin: any,
  muniPayload: any,
) => {
  // create & login admin
  const adminAgent = await createAndLogin(admin);

  // promote admin in DB so the account has permission to create municipality users
  await prisma.user.update({
    where: { username: admin.username },
    data: { role: "ADMIN" },
  });

  // admin creates municipality user via /api/users/municipality-users
  const res = await adminAgent
    .post("/api/users/municipality-users")
    .send(muniPayload);

  expect(res.status).toBe(201);

  // login municipality user via normal session endpoint
  const muniAgent: any = request.agent(app);
  await loginAgent(muniAgent, muniPayload.username, muniPayload.password);

  return { adminAgent, muniAgent, createdMunicipality: res.body };
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
  });

  afterAll(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it("201 creates a report with photos (multipart), returning JSON body per swagger-like shape", async () => {
    const agent = await createAndLogin(fakeUser);

    const body = await createReportAs(agent, {
      title: "Broken street light",
      description: "The street light on Via Roma has been broken for a week",
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

    expect(body).toHaveProperty("id");
    expect(typeof body.id).toBe("number");
    expect(body).toHaveProperty("title", "Broken street light");
    expect(Array.isArray(body.photos)).toBe(true);
    expect(body.photos.length).toBeGreaterThanOrEqual(1);
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

    const res = await post.expect(500);
    expect(res.body).toHaveProperty("error", "Internal Server Error");
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
  });

  afterAll(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
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

    const adminAgent = await createAndLogin(admin);

    // promote admin in DB so the account has permission to create municipality users
    await prisma.user.update({
      where: { username: admin.username },
      data: { role: "ADMIN" },
    });

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

    const { muniAgent } = await createAdminAndCreateMunicipality(
      admin,
      muniPayload,
    );
    const res = await muniAgent.get("/api/reports").expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // it("401 when unauthenticated requires role ADMIN or MUNICIPALITY", async () => {
  //   const res = await request(app).get("/api/reports");
  //   expect(res.status).toBe(401);
  // });
  it("400 when unauthenticated requires role ADMIN or MUNICIPALITY (OpenAPI validation)", async () => {
    const res = await request(app).get("/api/reports");
    expect(res.status).toBe(400); // OpenAPI validation
  });

  it("403 when authenticated as CITIZEN (not allowed)", async () => {
    const agent = await createAndLogin(fakeUser);
    const res = await agent.get("/api/reports");
    expect(res.status).toBe(403);
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
  });

  afterAll(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
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
  });

  afterAll(async () => {
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
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

    const { muniAgent } = await createAdminAndCreateMunicipality(
      admin,
      muniPayload,
    );

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

    const { muniAgent } = await createAdminAndCreateMunicipality(
      admin,
      muniPayload,
    );

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
      // .expect(401);
      .expect(400); // OpenAPI validation
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

    const { muniAgent } = await createAdminAndCreateMunicipality(
      admin,
      muniPayload,
    );

    const res = await muniAgent
      .post("/api/reports/999999")
      .send({ status: "ASSIGNED" })
      .expect(404);
  });
});
