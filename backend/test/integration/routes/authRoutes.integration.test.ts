import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "@app";

const prisma = new PrismaClient();

describe("AuthRoutes Integration Tests", () => {
  let fakeUser = {
    username: "mrossi",
    email: "mr@example.com",
    firstName: "Mario",
    lastName: "Rossi",
    password: "pwd",
  };

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

    await prisma.$disconnect();
  });

  describe("POST /api/auth/session (Login)", () => {
    it("200 login con identifier=username, Set-Cookie authToken e Location /reports", async () => {
      const u = fakeUser;
      await request(app).post("/api/users").send(u).expect(201);

      const res = await request(app)
        .post("/api/auth/session")
        .send({
          identifier: u.username,
          password: u.password,
          role: "CITIZEN",
        })
        .expect(200);

      const setCookie = res.headers["set-cookie"] || [];
      expect(
        Array.isArray(setCookie) ? setCookie.join(";") : setCookie,
      ).toMatch(/authToken=/i);
      expect(res.headers.location).toBe("/reports");
    });

    it("200 login anche con identifier=email", async () => {
      const u = fakeUser;
      await request(app).post("/api/users").send(u).expect(201);

      await request(app)
        .post("/api/auth/session")
        .send({ identifier: u.email, password: u.password, role: "CITIZEN" })
        .expect(200);
    });

    it("400 se manca identifier o password", async () => {
      await request(app)
        .post("/api/auth/session")
        .send({ identifier: "x" })
        .expect(400);

      await request(app)
        .post("/api/auth/session")
        .send({ password: "x" })
        .expect(400);
    });

    it("401 su credenziali errate", async () => {
      const u = fakeUser;
      await request(app).post("/api/users").send(u).expect(201);

      const res = await request(app)
        .post("/api/auth/session")
        .send({ identifier: u.email, password: "wrong", role: "CITIZEN" })
        .expect(401);

      expect(res.body).toHaveProperty("error");
      expect(res.body).toHaveProperty("message");
    });
  });

  describe("GET /api/auth/session (Verify authentication)", () => {
    it("200 se autenticato, payload conforme a schema User (no email/password)", async () => {
      const agent = request.agent(app); // <-- usa agent
      const u = fakeUser;

      await agent.post("/api/users").send(u).expect(201);
      await agent
        .post("/api/auth/session")
        .send({ identifier: u.username, password: u.password, role: "CITIZEN" })
        .expect(200);

      const res = await agent.get("/api/auth/session").expect(200); // <-- stesso agent

      expect(res.headers["content-type"]).toMatch(/application\/json/);
      expect(res.body).toHaveProperty("firstName");
      expect(res.body).toHaveProperty("lastName");
      expect(res.body).toHaveProperty("username");
      // expect(res.body).not.toHaveProperty("email");
      expect(res.body).not.toHaveProperty("password");
    });

    it("401 se non autenticato", async () => {
      const res = await request(app).get("/api/auth/session").expect(401);
      expect(res.body).toHaveProperty("error");
      expect(res.body).toHaveProperty("message");
    });
  });

  describe("DELETE /api/auth/session (Logout)", () => {
    it("204 logout da autenticato e poi verify → 401", async () => {
      const u = fakeUser;
      const a = request.agent(app);

      await a.post("/api/users").send(u).expect(201);
      await a
        .post("/api/auth/session")
        .send({ identifier: u.email, password: u.password, role: "CITIZEN" })
        .expect(200);

      await a.delete("/api/auth/session").expect(204);
      await a.get("/api/auth/session").expect(401);
    });

    it("401 logout senza essere autenticato", async () => {
      const res = await request(app).delete("/api/auth/session").expect(401);
      expect(res.body).toHaveProperty("error");
      expect(res.body).toHaveProperty("message");
    });
  });
});
