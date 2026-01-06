import request from "supertest";
import app from "@app";
import { getTestPrisma } from "../../setup/test-datasource";
import * as emailService from "@services/emailService";
import { emailVerificationService } from "@services/emailVerificationService";
import { CONFIG } from "@config";

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
    await prisma.pending_verification_user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.admin_user.deleteMany();
  });

  afterAll(async () => {
    await prisma.report.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.user.deleteMany();
    await prisma.pending_verification_user.deleteMany();
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
      await request(app)
        .post("/api/users")
        .send({ ...u, role: "CITIZEN" })
        .expect(201);

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

      await agent
        .post("/api/users")
        .send({ ...u, role: "CITIZEN" })
        .expect(201);

      await agent
        .post("/api/auth/verify")
        .send({
          emailOrUsername: u.email,
          code: (globalThis as any).__lastSentVerificationCode,
        })
        .expect(201);

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

      await a
        .post("/api/users")
        .send({ ...u, role: "CITIZEN" })
        .expect(201);

      await a
        .post("/api/auth/verify")
        .send({
          emailOrUsername: u.email,
          code: (globalThis as any).__lastSentVerificationCode,
        })
        .expect(201);

      await a
        .post("/api/auth/session")
        .send({ identifier: u.email, password: u.password, role: "CITIZEN" })
        .expect(200);

      await a.delete("/api/auth/session").expect(204);

      // Subsequent request without credentials should fail
      await a.get("/api/auth/session").expect(401);
    });
  });

  describe("POST /api/auth/verify - Verification flow", () => {
    it("201 verifies code, creates user and sets cookie", async () => {
      // Use public registration flow so email mock is invoked
      const u = {
        username: "verify1",
        email: "verify1@example.com",
        firstName: "V",
        lastName: "One",
        password: "pwd",
      };

      await request(app)
        .post("/api/users")
        .send({ ...u, role: "CITIZEN" })
        .expect(201);

      // ensure mock was called and code recorded
      expect((globalThis as any).__lastSentVerificationCode).toBeDefined();
      const code = (globalThis as any).__lastSentVerificationCode as string;

      const res = await request(app)
        .post("/api/auth/verify")
        .send({ emailOrUsername: u.email, code })
        .expect(201);

      expect(res.body).toHaveProperty("success", true);
      const setCookie = res.headers["set-cookie"] || [];
      expect(
        Array.isArray(setCookie) ? setCookie.join(";") : setCookie,
      ).toMatch(/authToken=/i);

      const pending = await emailVerificationService.getPendingVerification(
        u.email,
      );
      expect(pending).toBeNull();
    });

    it("400 on invalid code and increments attempts", async () => {
      // create pending via public registration to invoke email mock
      const u = {
        username: "verify2",
        email: "verify2@example.com",
        firstName: "V",
        lastName: "Two",
        password: "pwd",
      };

      await request(app)
        .post("/api/users")
        .send({ ...u, role: "CITIZEN" })
        .expect(201);

      const res = await request(app)
        .post("/api/auth/verify")
        .send({ emailOrUsername: "verify2@example.com", code: "000000" })
        .expect(400);

      expect(res.body).toHaveProperty("error");
      const updated = await emailVerificationService.getPendingVerification(
        "verify2@example.com",
      );
      expect(updated?.verificationAttempts).toBe(1);
    });

    it("400 on expired code and deletes pending", async () => {
      // create pending via public registration so mock is invoked
      const u = {
        username: "verify3",
        email: "verify3@example.com",
        firstName: "V",
        lastName: "Three",
        password: "pwd",
      };

      await request(app)
        .post("/api/users")
        .send({ ...u, role: "CITIZEN" })
        .expect(201);

      // force expiry by updating DB directly (only way in integration tests)
      await prisma.pending_verification_user.updateMany({
        where: { email: u.email },
        data: { verificationCodeExpiry: new Date(Date.now() - 1000) },
      });

      const code = (globalThis as any).__lastSentVerificationCode as string;

      const res = await request(app)
        .post("/api/auth/verify")
        .send({ emailOrUsername: u.email, code })
        .expect(400);

      const still = await emailVerificationService.getPendingVerification(
        u.email,
      );
      expect(still).toBeNull();
    });

    it("400 missing fields", async () => {
      await request(app)
        .post("/api/auth/verify")
        .send({ code: "123456" })
        .expect(400);

      await request(app)
        .post("/api/auth/verify")
        .send({ emailOrUsername: "no-code" })
        .expect(400);
    });

    it("404 when no pending verification exists", async () => {
      const res = await request(app)
        .post("/api/auth/verify")
        .send({
          emailOrUsername: "no-pending-verify@example.com",
          code: "123456",
        })
        .expect(404);

      expect(res.body).toHaveProperty("error");
      expect(res.body).toHaveProperty("message");
    });

    it("429 too many attempts deletes pending", async () => {
      const u = {
        username: "attempts",
        email: "attempts@example.com",
        firstName: "A",
        lastName: "Try",
        password: "pwd",
      };

      await request(app)
        .post("/api/users")
        .send({ ...u, role: "CITIZEN" })
        .expect(201);

      // set attempts to max
      await prisma.pending_verification_user.updateMany({
        where: { email: u.email },
        data: { verificationAttempts: CONFIG.MAX_VERIFICATION_ATTEMPTS },
      });

      const code = (globalThis as any).__lastSentVerificationCode as string;

      await request(app)
        .post("/api/auth/verify")
        .send({ emailOrUsername: u.email, code })
        .expect(429);

      const pending = await emailVerificationService.getPendingVerification(
        u.email,
      );
      expect(pending).toBeNull();
    });
  });

  describe("POST /api/auth/resend-code - Verification flow", () => {
    it("200 resend code (controller re-creates pending and sends email)", async () => {
      // create initial pending via public registration so mock is invoked
      const u = {
        username: "resend",
        email: "resend@example.com",
        firstName: "R",
        lastName: "One",
        password: "pwd",
      };

      await request(app)
        .post("/api/users")
        .send({ ...u, role: "CITIZEN" })
        .expect(201);

      // make the pending old enough to bypass rate limit
      await prisma.pending_verification_user.updateMany({
        where: { email: u.email },
        data: { createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      });

      const sendMock = emailService.sendVerificationEmail as jest.Mock;

      const res = await request(app)
        .post("/api/auth/resend-code")
        .send({ emailOrUsername: u.email })
        .expect(200);

      expect(res.body).toHaveProperty("success", true);
      expect(sendMock).toHaveBeenCalled();
    });

    it("400 missing field and 404 when no pending", async () => {
      // missing field
      await request(app).post("/api/auth/resend-code").send({}).expect(400);

      // unknown email -> 404
      const res = await request(app)
        .post("/api/auth/resend-code")
        .send({ emailOrUsername: "doesnotexist@example.com" })
        .expect(404);
      expect(res.body).toHaveProperty("error");
    });

    it("404 when no pending verification exists", async () => {
      const res = await request(app)
        .post("/api/auth/resend-code")
        .send({ emailOrUsername: "no-pending@example.com" })
        .expect(404);

      expect(res.body).toHaveProperty("error");
      expect(res.body).toHaveProperty("message");
    });

    it("429 rate limited", async () => {
      const u = {
        username: "rate",
        email: "rate@example.com",
        firstName: "R",
        lastName: "Ate",
        password: "pwd",
      };

      await request(app)
        .post("/api/users")
        .send({ ...u, role: "CITIZEN" })
        .expect(201);

      // immediate resend should be rate limited by service
      const res = await request(app)
        .post("/api/auth/resend-code")
        .send({ emailOrUsername: u.email })
        .expect(429);

      expect(res.body).toHaveProperty("error");
      expect(res.body).toHaveProperty("message");
    });
  });
});
