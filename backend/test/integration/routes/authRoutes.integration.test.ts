import request from "supertest";
import app from "@app";
import { getTestPrisma } from "../../setup/test-datasource";

let prisma: any;

describe("Auth Routes - Integration Tests", () => {
  beforeAll(async () => {
    prisma = await getTestPrisma();
  });

  beforeEach(async () => {
    // cleanup DB per evitare conflitti unique
    // Delete in correct order to respect foreign key constraints
    await prisma.report.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.admin_user.deleteMany();
  });

  afterAll(async () => {
    await prisma.report.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.admin_user.deleteMany();
    // DO NOT disconnect - singleton is managed by test setup
  });

  describe("POST /api/auth/session - Error Scenarios", () => {
    it("400 missing identifier field", async () => {
      await request(app)
        .post("/api/auth/session")
        .send({ password: "x" })
        .expect(400);
    });

    it("400 missing password field", async () => {
      await request(app)
        .post("/api/auth/session")
        .send({ identifier: "x" })
        .expect(400);
    });

    it("401 on incorrect password", async () => {
      const u = {
        username: "mrossi1",
        email: "mr1@example.com",
        firstName: "Mario",
        lastName: "Rossi",
        password: "pwd",
      };
      await request(app).post("/api/users").send({ ...u, role: "CITIZEN" }).expect(201);

      const res = await request(app)
        .post("/api/auth/session")
        .send({ identifier: u.email, password: "wrong", role: "CITIZEN" })
        .expect(401);

      expect(res.body).toHaveProperty("error");
      expect(res.body).toHaveProperty("message");
    });

    it("401 on non-existent user", async () => {
      const res = await request(app)
        .post("/api/auth/session")
        .send({
          identifier: "nonexistent@example.com",
          password: "anypassword",
          role: "CITIZEN",
        })
        .expect(401);

      expect(res.body).toHaveProperty("error");
    });
  });

  describe("GET /api/auth/session - Error Scenarios", () => {
    it("401 when unauthenticated", async () => {
      const res = await request(app).get("/api/auth/session").expect(401);
      expect(res.body).toHaveProperty("error");
      expect(res.body).toHaveProperty("message");
    });

    it("200 response includes user fields but not sensitive data", async () => {
      const agent = request.agent(app);
      const u = {
        username: "mrossi2",
        email: "mr2@example.com",
        firstName: "Mario",
        lastName: "Rossi",
        password: "pwd",
      };

      await agent.post("/api/users").send({ ...u, role: "CITIZEN" }).expect(201);
      await agent
        .post("/api/auth/session")
        .send({ identifier: u.username, password: u.password, role: "CITIZEN" })
        .expect(200);

      const res = await agent.get("/api/auth/session").expect(200);

      expect(res.body).toHaveProperty("firstName");
      expect(res.body).toHaveProperty("lastName");
      expect(res.body).toHaveProperty("username");
      expect(res.body).not.toHaveProperty("password");
    });
  });

  describe("DELETE /api/auth/session - Error Scenarios", () => {
    it("401 logout when unauthenticated", async () => {
      const res = await request(app).delete("/api/auth/session").expect(401);
      expect(res.body).toHaveProperty("error");
      expect(res.body).toHaveProperty("message");
    });

    it("204 logout clears session for subsequent requests", async () => {
      const u = {
        username: "mrossi3",
        email: "mr3@example.com",
        firstName: "Mario",
        lastName: "Rossi",
        password: "pwd",
      };
      const a = request.agent(app);

      await a.post("/api/users").send({ ...u, role: "CITIZEN" }).expect(201);
      await a
        .post("/api/auth/session")
        .send({ identifier: u.email, password: u.password, role: "CITIZEN" })
        .expect(200);

      await a.delete("/api/auth/session").expect(204);

      // Subsequent request without credentials should fail
      await a.get("/api/auth/session").expect(401);
    });
  });
});
