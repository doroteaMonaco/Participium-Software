import request from "supertest";
import { PrismaClient } from "@prisma/client";
import app from "@app";

const prisma = new PrismaClient();

describe("Municipality Integration Tests", () => {
  const base = "/api/users";
  let adminAgent: any;

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
    // Clean database
    await prisma.user.deleteMany();

    // Create and login admin user using the regular flow
    const adminUser = {
      username: "admin_integration",
      email: "admin_integration@example.com",
      firstName: "Admin",
      lastName: "Integration",
      password: "adminpass123",
    };

    // Create agent and register admin
    adminAgent = request.agent(app);

    // Register admin user
    await adminAgent.post("/api/users").send(adminUser).expect(201);

    // Promote to admin manually
    await prisma.user.update({
      where: { email: adminUser.email },
      data: { role: "ADMIN" },
    });

    // Login to get cookie
    await adminAgent
      .post("/api/auth/session")
      .send({ identifier: adminUser.email, password: adminUser.password })
      .expect(200);
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe("POST /api/users/municipality-users", () => {
    const validPayload = {
      email: "municipality@test.com",
      username: "municipality_user",
      firstName: "Municipality",
      lastName: "User",
      password: "password123",
      municipality_role_id: 1,
    };

    it("201 creates municipality user with valid admin authentication", async () => {
      const response = await adminAgent
        .post(`${base}/municipality-users`)
        .send(validPayload)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.email).toBe(validPayload.email);
      expect(response.body.username).toBe(validPayload.username);
      expect(response.body.role).toBe("MUNICIPALITY");
      expect(response.body.municipality_role_id).toBe(
        validPayload.municipality_role_id,
      );
    });

    it("400 when required fields are missing", async () => {
      const invalidPayload = { ...validPayload };
      delete (invalidPayload as any).municipality_role_id;

      const response = await adminAgent
        .post(`${base}/municipality-users`)
        .send(invalidPayload)
        .expect(400);

      expect(response.body).toHaveProperty("error", "Validation Error");
      expect(response.body.message).toContain("must have required property 'municipality_role_id'");
    });

    it("401 when not authenticated", async () => {
      await request(app)
        .post(`${base}/municipality-users`)
        .send(validPayload)
        .expect(401);
    });

    it("409 when email already exists", async () => {
      // Create first user
      await adminAgent
        .post(`${base}/municipality-users`)
        .send(validPayload)
        .expect(201);

      // Try to create duplicate
      const response = await adminAgent
        .post(`${base}/municipality-users`)
        .send(validPayload)
        .expect(409);

      expect(response.body).toHaveProperty("error", "Conflict Error");
      expect(response.body.message).toContain("already in use");
    });

    it("409 when username already exists", async () => {
      // Create first user
      await adminAgent
        .post(`${base}/municipality-users`)
        .send(validPayload)
        .expect(201);

      // Try to create with different email but same username
      const duplicateUsername = {
        ...validPayload,
        email: "different@test.com",
      };
      const response = await adminAgent
        .post(`${base}/municipality-users`)
        .send(duplicateUsername)
        .expect(409);

      expect(response.body).toHaveProperty("error", "Conflict Error");
      expect(response.body.message).toContain("already in use");
    });
  });

  describe("GET /api/users/municipality-users", () => {
    beforeEach(async () => {
      // Create test municipality users
      await adminAgent
        .post(`${base}/municipality-users`)
        .send({
          email: "mayor@city.com",
          username: "mayor",
          firstName: "John",
          lastName: "Mayor",
          password: "password123",
          municipality_role_id: 1,
        })
        .expect(201);

      await adminAgent
        .post(`${base}/municipality-users`)
        .send({
          email: "councilor@city.com",
          username: "councilor",
          firstName: "Jane",
          lastName: "Councilor",
          password: "password123",
          municipality_role_id: 2,
        })
        .expect(201);
    });

    it("200 returns list of municipality users with admin authentication", async () => {
      const response = await adminAgent
        .get(`${base}/municipality-users`)
        .expect(200);

      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBe(2);

      // Check that all returned users have MUNICIPALITY role
      response.body.forEach((user: any) => {
        expect(user).toHaveProperty("id");
        expect(user).toHaveProperty("email");
        expect(user).toHaveProperty("username");
        expect(user).toHaveProperty("role", "MUNICIPALITY");
        expect(user).toHaveProperty("municipality_role_id");
      });

      // Check specific users exist
      const emails = response.body.map((user: any) => user.email);
      expect(emails).toContain("mayor@city.com");
      expect(emails).toContain("councilor@city.com");
    });

    it("200 returns empty array when no municipality users exist", async () => {
      // Clean up municipality users
      await prisma.user.deleteMany({
        where: { role: "MUNICIPALITY" },
      });

      const response = await adminAgent
        .get(`${base}/municipality-users`)
        .expect(200);

      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBe(0);
    });

    it("401 when not authenticated", async () => {
      await request(app).get(`${base}/municipality-users`).expect(401);
    });
  });

  describe("GET /api/users/municipality-users/roles", () => {
    it("200 returns list of municipality roles with admin authentication", async () => {
      const response = await adminAgent
        .get(`${base}/municipality-users/roles`)
        .expect(200);

      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThan(0);

      // Check structure of roles
      response.body.forEach((role: any) => {
        expect(role).toHaveProperty("id");
        expect(role).toHaveProperty("name");
      });

      // Check specific roles exist (using real roles from database)
      const roleNames = response.body.map((role: any) => role.name);
      expect(roleNames).toContain("municipal public relations officer");
      expect(roleNames).toContain("municipal administrator");
      expect(roleNames).toContain("technical office staff member");
    });

    it("401 when not authenticated", async () => {
      await request(app).get(`${base}/municipality-users/roles`).expect(401);
    });
  });
});
