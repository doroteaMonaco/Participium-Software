import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { userService } from "@services/userService";
import app from "@app";
import { roleType } from "@models/enums";

const prisma = new PrismaClient();

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

  beforeEach(async () => {
    // ensure clean DB between tests
    await prisma.report.deleteMany();
    await prisma.user.deleteMany();
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
    await prisma.user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.municipality_role.deleteMany();
    await prisma.$disconnect();
  });

  const makeAdminAgent = async () => {
    // Create admin user manually
    await userService.registerUser(adminUser, roleType.ADMIN);

    // Create agent and register admin
    const agent = request.agent(app);

    // Login to get cookie
    const loginRes = await agent.post("/api/auth/session").send({
      identifier: adminUser.email,
      password: adminUser.password,
      role: "ADMIN",
    });
    const setCookie = loginRes.headers["set-cookie"] || [];
    expect(Array.isArray(setCookie) ? setCookie.join(";") : setCookie).toMatch(
      /authToken=/i,
    );

    return agent;
  };

  const makeNormalAgent = async () => {
    const agent = request.agent(app);
    await agent.post("/api/users").send(normalUser).expect(201);
    const loginRes = await agent.post("/api/auth/session").send({
      identifier: normalUser.email,
      password: normalUser.password,
      role: "CITIZEN",
    });
    expect(loginRes.status).toBe(200);
    return agent;
  };

  describe("POST /api/users (Registration)", () => {
    it("201 crea utente, imposta Set-Cookie authToken e Location /reports", async () => {
      const res = await request(app)
        .post("/api/users")
        .set("Accept", "application/json")
        .send({ ...normalUser, role: "CITIZEN" })
        .expect(201);

      const setCookie = res.headers["set-cookie"] || [];
      expect(
        Array.isArray(setCookie) ? setCookie.join(";") : setCookie,
      ).toMatch(/authToken=/i);

      // Swagger indica Location: /reports
      expect(res.headers.location).toBe("/reports");

      expect(res.headers["content-type"]).toMatch(/application\/json/);
      expect(res.body).toBeDefined();
    });

    it("400 se body mancante/non valido", async () => {
      const res = await request(app)
        .post("/api/users")
        .set("Accept", "application/json")
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty("error");
      expect(res.body).toHaveProperty("message");
    });

    it("409 su duplicato (username o email già esistenti)", async () => {
      await request(app).post("/api/users").send(normalUser).expect(201);

      const res = await request(app).post("/api/users").send(normalUser);
      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty("error");
      expect(res.body).toHaveProperty("message");
    });

    it("400 su JSON malformato", async () => {
      const res = await request(app)
        .post("/api/users")
        .set("Content-Type", "application/json")
        .send('{"firstName":"A",') // JSON rotto
        .expect(400);

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

    it("401 when not authenticated", async () => {
      const res = await request(app).get(`${base}`).expect(401);
    });

    it("403 when authenticated non-admin", async () => {
      const user = await makeNormalAgent();
      await user.get(`${base}`).expect(403);
    });

    it("500 when service fails", async () => {
      const admin = await makeAdminAgent();
      jest
        .spyOn(userService, "getAllUsers")
        .mockRejectedValue(new Error("db fail"));
      await admin.get(`${base}`).expect(500);
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

    it("400 for invalid (non-integer) id", async () => {
      const admin = await makeAdminAgent();
      await admin.get(`${base}/abc`).send({ role: "CITIZEN" }).expect(400);
    });

    it("404 when user not found", async () => {
      const admin = await makeAdminAgent();
      await admin.get(`${base}/999999`).send({ role: "CITIZEN" }).expect(404);
    });

    it("401 when not authenticated", async () => {
      await request(app).get(`${base}/1`).expect(401);
    });

    it("403 when authenticated non-admin", async () => {
      const user = await makeNormalAgent();
      await user.get(`${base}/1`).expect(403);
    });

    it("500 when service fails", async () => {
      const admin = await makeAdminAgent();
      jest
        .spyOn(userService, "getUserById")
        .mockRejectedValue(new Error("db fail"));
      await admin.get(`${base}/1`).expect(500);
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

    it("400 for invalid id", async () => {
      const admin = await makeAdminAgent();
      await admin.delete(`${base}/xyz`).send({ role: "CITIZEN" });
      expect(400);
    });

    it("404 when user not found", async () => {
      const admin = await makeAdminAgent();
      await admin
        .delete(`${base}/999999`)
        .send({ role: "CITIZEN" })
        .expect(404);
    });

    it("401 when not authenticated", async () => {
      await request(app).delete(`${base}/1`).expect(401);
    });

    it("403 when authenticated non-admin", async () => {
      const user = await makeNormalAgent();
      await user.delete(`${base}/1`).expect(403);
    });

    it("500 when service fails", async () => {
      const admin = await makeAdminAgent();
      jest
        .spyOn(userService, "deleteUser")
        .mockRejectedValue(new Error("db fail"));
      await admin.delete(`${base}/1`).expect(500);
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

    it("400 when required fields are missing", async () => {
      const admin = await makeAdminAgent();

      const bad = { ...payload };
      delete (bad as any).municipality_role_id;

      const res = await admin
        .post(`${base}/municipality-users`)
        .send(bad)
        .expect(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body).toHaveProperty("message");
    });

    it("401 when not authenticated", async () => {
      await request(app)
        .post(`${base}/municipality-users`)
        .send(payload)
        .expect(401);
    });

    it("403 when authenticated but not ADMIN", async () => {
      const user = await makeNormalAgent();
      await user.post(`${base}/municipality-users`).send(payload).expect(403);
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

    it("401 when not authenticated", async () => {
      await request(app).get(`${base}/municipality-users/roles`).expect(401);
    });

    it("403 when authenticated non-admin", async () => {
      const user = await makeNormalAgent();
      await user.get(`${base}/municipality-users/roles`).expect(403);
    });

    it("500 when service fails", async () => {
      const admin = await makeAdminAgent();
      jest
        .spyOn(userService, "getAllMunicipalityRoles")
        .mockRejectedValue(new Error("db fail"));
      await admin.get(`${base}/municipality-users/roles`).expect(500);
    });
  });
});
