import request from "supertest";
import { userService } from "@services/userService";
import app from "@app";
import { roleType } from "@models/enums";
import { getTestPrisma } from "../../setup/test-datasource";
import * as emailService from "@services/emailService";

let prisma: any;

describe("Admin routes integration tests", () => {
  const base = "/api/users";

  const normalUser = {
    username: "citizen1",
    email: "citizen1@example.com",
    firstName: "Cito",
    lastName: "Zen",
    password: "pass123",
  };

  const adminUser = {
    username: "admin1",
    email: "admin1@example.com",
    firstName: "Admin",
    lastName: "Istrator",
    password: "adminpass",
  };

  beforeAll(async () => {
    prisma = await getTestPrisma();
  });

  beforeEach(async () => {
    // ensure clean DB between tests
    await prisma.report.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.external_maintainer.deleteMany();
    await prisma.user.deleteMany();
    await prisma.pending_verification_user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.municipality_role.deleteMany();
    await prisma.municipality_role.createMany({
      data: [
        { id: 1, name: "OPERATOR" },
        { id: 2, name: "VALIDATOR" },
        { id: 3, name: "SUPERVISOR" },
      ],
      skipDuplicates: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.report.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.external_maintainer.deleteMany();
    await prisma.user.deleteMany();
    await prisma.pending_verification_user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.municipality_role.deleteMany();
    // DO NOT disconnect - singleton is managed by test setup
  });

  const makeAdminAgent = async () => {
    // Create admin user via service to avoid direct DB access
    await userService.registerUser(
      {
        username: adminUser.username,
        email: adminUser.email,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        password: adminUser.password,
      },
      roleType.ADMIN,
    );

    // Create agent and login
    const agent = request.agent(app);

    // Login to get cookie
    const loginRes = await agent.post("/api/auth/session").send({
      identifier: adminUser.email,
      password: adminUser.password,
      role: "ADMIN",
    });

    expect(loginRes.status).toBe(200);
    const setCookie = loginRes.headers["set-cookie"] || [];
    expect(Array.isArray(setCookie) ? setCookie.join(";") : setCookie).toMatch(
      /authToken=/i,
    );

    return agent;
  };

  describe("POST /api/users (Registration)", () => {
    it("201 avvia registrazione e invia codice di verifica via email", async () => {
      const res = await request(app)
        .post("/api/users")
        .set("Accept", "application/json")
        .send({ ...normalUser, role: "CITIZEN" })
        .expect(201);

      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("email", normalUser.email);
      const sendMock = emailService.sendVerificationEmail as jest.Mock;
      expect(sendMock).toHaveBeenCalled();
      expect((global as any).__lastSentVerificationCode).toBeDefined();
    });

    it("400 when missing required fields", async () => {
      await request(app)
        .post("/api/users")
        .send({ username: "onlyuser" })
        .expect(400);
    });

    it("409 when email already used by active user", async () => {
      const existing = {
        username: "existing",
        email: "existing@example.com",
        firstName: "Ex",
        lastName: "Ist",
        password: "pwd",
      };

      // create active user via service
      await userService.registerUser(existing, roleType.CITIZEN);

      const res = await request(app)
        .post("/api/users")
        .send({ ...existing, role: "CITIZEN" })
        .expect(409);

      expect(res.body).toHaveProperty("error");
      expect(res.body).toHaveProperty("message");
    });

    it("409 when registration already pending returns proper message", async () => {
      // first registration creates pending
      await request(app)
        .post("/api/users")
        .send({ ...normalUser, role: "CITIZEN" })
        .expect(201);

      const res = await request(app)
        .post("/api/users")
        .send({ ...normalUser, role: "CITIZEN" })
        .expect(409);

      expect(res.body).toHaveProperty("message");
      expect(res.body.message).toMatch(/pending verification/i);
    });

    it("409 su duplicato (username o email già esistenti)", async () => {
      await request(app).post("/api/users").send(normalUser).expect(201);

      const res = await request(app).post("/api/users").send(normalUser);
      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty("error");
      expect(res.body).toHaveProperty("message");
    });
  });

  // GET /users
  describe("GET /api/users", () => {
    it("200 returns list when requested by ADMIN", async () => {
      const admin = await makeAdminAgent();

      // create couple users
      await admin
        .post(`${base}/municipality-users`)
        .send({
          email: "u1@muni.com",
          username: "u1",
          firstName: "U",
          lastName: "One",
          password: "p",
          municipality_role_id: 1,
        })
        .expect(201);

      const res = await admin.get(`${base}`).expect(200);
      expect(Array.isArray(res.body)).toBeTruthy();
    });
  });

  // GET /users/:id
  describe("GET /api/users/:id", () => {
    it("200 returns user details for existing id (ADMIN)", async () => {
      const admin = await makeAdminAgent();

      const created = await admin
        .post(`${base}/municipality-users`)
        .send({
          email: "target@muni.com",
          username: "target",
          firstName: "Tar",
          lastName: "Get",
          password: "p",
          municipality_role_id: 1,
          role: "MUNICIPALITY",
        })
        .expect(201);

      const id = created.body.id;
      const res = await admin
        .get(`${base}/${id}`)
        .send({ role: "MUNICIPALITY" })
        .expect(200);
      expect(res.body).toHaveProperty("id", id);
      expect(res.body).toHaveProperty("username", "target");
    });

    it("404 when user not found", async () => {
      const admin = await makeAdminAgent();
      await admin.get(`${base}/999999`).send({ role: "CITIZEN" }).expect(404);
    });
  });

  // DELETE /users/:id
  describe("DELETE /api/users/:id", () => {
    it("204 deletes user when requested by ADMIN", async () => {
      const admin = await makeAdminAgent();

      const created = await admin
        .post(`${base}/municipality-users`)
        .send({
          email: "todelete@muni.com",
          username: "todelete",
          firstName: "To",
          lastName: "Delete",
          password: "p",
          municipality_role_id: 1,
          role: "MUNICIPALITY",
        })
        .expect(201);

      const id = created.body.id;
      const response = await admin
        .delete(`${base}/${id}`)
        .send({ role: "MUNICIPALITY" })
        .expect(204);

      // subsequent GET -> 404
      await admin
        .get(`${base}/${id}`)
        .send({ role: "MUNICIPALITY" })
        .expect(404);
    });

    it("404 when user not found", async () => {
      const admin = await makeAdminAgent();
      await admin
        .delete(`${base}/999999`)
        .send({ role: "CITIZEN" })
        .expect(404);
    });
  });

  // POST /users/municipality-users
  describe("POST /api/users/municipality-users", () => {
    const payload = {
      email: "muni@example.com",
      username: "muni-op",
      firstName: "Muni",
      lastName: "Op",
      password: "pwd",
      municipality_role_id: 2,
    };

    it("201 creates municipality user when requested by ADMIN", async () => {
      const admin = await makeAdminAgent();

      const res = await admin
        .post(`${base}/municipality-users`)
        .send(payload)
        .expect(201);

      expect(res.headers["content-type"]).toMatch(/application\/json/);
      expect(res.body).toHaveProperty("id");
      expect(res.body.email).toBe(payload.email);
      expect(res.body.username).toBe(payload.username);
    });

    it("409 when email or username already exists", async () => {
      const admin = await makeAdminAgent();

      // create first
      await admin.post(`${base}/municipality-users`).send(payload).expect(201);

      // try again -> should conflict
      const res = await admin
        .post(`${base}/municipality-users`)
        .send(payload)
        .expect(409);
      expect(res.body).toHaveProperty("error");
      expect(res.body).toHaveProperty("message");
    });

    it("500 when service fails", async () => {
      const admin = await makeAdminAgent();
      jest
        .spyOn(userService, "getMunicipalityUsers")
        .mockRejectedValue(new Error("db fail"));
      await admin.get(`${base}/municipality-users`).expect(500);
    });
  });

  // GET /users/municipality-users/roles
  describe("GET /api/users/municipality-users/roles", () => {
    it("200 returns list of municipality roles for ADMIN", async () => {
      const admin = await makeAdminAgent();
      const res = await admin
        .get(`${base}/municipality-users/roles`)
        .expect(200);

      expect(Array.isArray(res.body)).toBeTruthy();
      expect(res.body.length).toBeGreaterThan(0);
      // basic shape check
      expect(res.body[0]).toHaveProperty("id");
      expect(res.body[0]).toHaveProperty("name");
    });
  });

  // GET /users/municipality-users
  describe("GET /api/users/municipality-users", () => {
    it("200 returns list of municipality users for ADMIN", async () => {
      const admin = await makeAdminAgent();

      await admin
        .post(`${base}/municipality-users`)
        .send({
          email: "m1@muni.com",
          username: "m1",
          firstName: "M",
          lastName: "One",
          password: "p",
          municipality_role_id: 1,
        })
        .expect(201);

      const res = await admin.get(`${base}/municipality-users`).expect(200);

      expect(Array.isArray(res.body)).toBeTruthy();
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it("500 when service fails", async () => {
      const admin = await makeAdminAgent();
      jest
        .spyOn(userService, "getMunicipalityUsers")
        .mockRejectedValue(new Error("db fail"));
      await admin.get(`${base}/municipality-users`).expect(500);
    });
  });

  // GET /users/external-users
  describe("GET /api/users/external-users", () => {
    it("200 returns list of external maintainer users for ADMIN", async () => {
      const admin = await makeAdminAgent();
      const res = await admin.get(`${base}/external-users`).expect(200);

      expect(Array.isArray(res.body)).toBeTruthy();
    });
  });

  // POST /users/external-users
  describe("POST /api/users/external-users", () => {
    it("201 creates external maintainer user when requested by ADMIN", async () => {
      const admin = await makeAdminAgent();

      const payload = {
        email: "ext-1@example.com",
        username: "ext-user-1",
        firstName: "External",
        lastName: "Maintainer",
        password: "pwd123",
        companyName: "ExternalCorp",
        category: "WASTE",
      };

      const res = await admin.post(`${base}/external-users`).send(payload);

      if (res.status !== 201) {
        console.error("External user creation failed:", res.status, res.body);
      }

      // Should return 201 when valid external user is created
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
    });
  });
});
