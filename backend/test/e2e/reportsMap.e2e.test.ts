import request from "supertest";
import app from "@app";
import { roleType } from "@models/enums";
import { userService } from "@services/userService";
import { getTestPrisma } from "../setup/test-datasource";

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

let prisma: any;

// --- Helpers (stesso stile dei tuoi colleghi) ---
const registerUser = async (
  agent: request.SuperAgentTest,
  user: any,
  role: roleType = roleType.CITIZEN,
) => {
  const userData = { ...user, role };
  const res = await agent.post("/api/users").send(userData);
  expect(res.status).toBe(201);

  const verifyRes = await agent.post("/api/auth/verify").send({
    emailOrUsername: user.email,
    code: (global as any).__lastSentVerificationCode,
  });
  expect(verifyRes.status).toBe(201);
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
  await userService.registerUser(admin, roleType.ADMIN);

  const agent: any = request.agent(app);
  const adminAgent = await loginAgent(
    agent,
    admin.username,
    admin.password,
    "ADMIN" as any,
  );

  return adminAgent;
};

const createMunicipality = async (
  adminAgent: request.SuperAgentTest,
  municipality: any,
) => {
  const res = await adminAgent
    .post("/api/users/municipality-users")
    .send(municipality);

  expect(res.status).toBe(201);

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
    post.attach("photos", Buffer.from("fake"), {
      filename: "p.jpg",
      contentType: "image/jpeg",
    });
  }

  return post.expect(201).then((r) => r.body);
};

// alcune route possono ritornare array oppure wrapper {data}/{reports}
const extractList = (body: any): any[] => {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.reports)) return body.reports;
  if (Array.isArray(body?.data)) return body.data;
  return [];
};

describe("Reports Map E2E (public)", () => {
  beforeAll(async () => {
    prisma = await getTestPrisma();
  });

  beforeEach(async () => {
    // cleanup in ordine FK-safe
    await prisma.comment.deleteMany();
    await prisma.report.deleteMany();
    await prisma.external_maintainer.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.user.deleteMany();
    await prisma.pending_verification_user.deleteMany();

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
    await prisma.comment.deleteMany();
    await prisma.report.deleteMany();
    await prisma.external_maintainer.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.user.deleteMany();
    await prisma.pending_verification_user.deleteMany();
    await prisma.municipality_role.deleteMany();
    // DO NOT disconnect - singleton is managed by test setup
  });

  it("200 returns empty list when there are no reports (unauthenticated)", async () => {
    const res = await request(app).get("/api/reports/reports-map").expect(200);

    const list = extractList(res.body);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(0);
  });

  it("200 returns the report on the map after municipality assigns it (unauthenticated)", async () => {
    // Citizen creates report
    const citizen = {
      username: "citizen_map_e2e",
      email: "citizen_map_e2e@example.com",
      firstName: "Mario",
      lastName: "Rossi",
      password: "P@ssw0rd!",
    };
    const citizenAgent = await createAndLogin(citizen);

    const created = await createReportAs(citizenAgent, {
      title: "Map report",
      description: "Should appear in reports-map",
      category: "WASTE",
      latitude: 45.05,
      longitude: 7.65,
      photos: [
        {
          buffer: Buffer.from("fake_jpeg_bytes"),
          name: "photo.jpg",
          contentType: "image/jpeg",
        },
      ],
    });

    expect(created).toHaveProperty("id");

    // Admin + Municipality (role_id 4 matches WASTE nei test dei colleghi)
    const adminAgent = await createAdmin({
      username: "admin_map_e2e",
      email: "admin_map_e2e@example.com",
      firstName: "Admin",
      lastName: "Map",
      password: "AdminPass123",
    });

    const { muniAgent } = await createMunicipality(adminAgent, {
      username: "muni_map_e2e",
      email: "muni_map_e2e@example.com",
      firstName: "Muni",
      lastName: "Map",
      password: "MuniPass123",
      municipality_role_id: 4,
    });

    // Municipality assigns/approves report (così evitiamo che la map escluda PENDING)
    await muniAgent
      .post(`/api/reports/${created.id}`)
      .send({ status: "ASSIGNED" })
      .expect(200);

    // Public map endpoint WITHOUT auth
    const mapRes = await request(app).get("/api/reports/reports-map").expect(200);

    const list = extractList(mapRes.body);
    expect(Array.isArray(list)).toBe(true);

    const found = list.find((r: any) => r?.id === created.id);
    expect(found).toBeTruthy();

    // assert robust: lat/lng possono avere nomi diversi, ma di solito sono latitude/longitude
    const lat =
      found.latitude ?? found.lat ?? found.position?.lat ?? found.location?.lat;
    const lng =
      found.longitude ?? found.lng ?? found.position?.lng ?? found.location?.lng;

    expect(typeof lat).toBe("number");
    expect(typeof lng).toBe("number");
  });
});
