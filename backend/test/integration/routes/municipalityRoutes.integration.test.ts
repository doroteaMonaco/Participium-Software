import request from "supertest";
import { userService } from "@services/userService";
import app from "@app";
import { roleType } from "@models/enums";
import bcrypt from "bcrypt";
import { getTestPrisma } from "../../setup/test-datasource";

let prisma: any;

describe("Municipality Integration Tests", () => {
  const base = "/api/users";
  let adminAgent: any;

  beforeAll(async () => {
    prisma = await getTestPrisma();
  });

  beforeEach(async () => {
    // Clean database - delete in order respecting foreign key constraints
    await prisma.report.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.external_maintainer.deleteMany();
    await prisma.user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.municipality_role.deleteMany();
    // Re-seed municipality roles
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

    // Create and login admin user directly
    const adminUser = {
      username: "admin_integration",
      email: "admin_integration@example.com",
      firstName: "Admin",
      lastName: "Integration",
      password: "adminpass123",
    };

    // Create admin user directly in database with hashed password
    const hashedPassword = await bcrypt.hash(adminUser.password, 10);
    await prisma.admin_user.create({
      data: {
        username: adminUser.username,
        email: adminUser.email,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        password: hashedPassword,
      },
    });

    // Create agent and login
    adminAgent = request.agent(app);

    // Login to get cookie
    await adminAgent
      .post("/api/auth/session")
      .send({
        identifier: adminUser.email,
        password: adminUser.password,
        role: "ADMIN",
      })
      .expect(200);
  });

  describe("POST /api/users/municipality-users", () => {
    it("201 creates municipality user with valid admin authentication", async () => {
      const validPayload = {
        email: "municipality1@test.com",
        username: "municipality_user1",
        firstName: "Municipality",
        lastName: "User",
        password: "password123",
        municipality_role_id: 1,
      };

      const response = await adminAgent
        .post(`${base}/municipality-users`)
        .send(validPayload)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.email).toBe(validPayload.email);
      expect(response.body.username).toBe(validPayload.username);
      expect(response.body.municipality_role_id).toBe(
        validPayload.municipality_role_id,
      );
    });

    it("409 when email already exists", async () => {
      const validPayload = {
        email: "municipality_dup@test.com",
        username: "municipality_user_dup",
        firstName: "Municipality",
        lastName: "User",
        password: "password123",
        municipality_role_id: 1,
      };

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
      const validPayload = {
        email: "municipality_dup2@test.com",
        username: "municipality_user_dup2",
        firstName: "Municipality",
        lastName: "User",
        password: "password123",
        municipality_role_id: 1,
      };

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
    it("200 returns list of municipality users with admin authentication", async () => {
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
        expect(user).toHaveProperty("municipality_role_id");
      });

      // Check specific users exist
      const emails = response.body.map((user: any) => user.email);
      expect(emails).toContain("mayor@city.com");
      expect(emails).toContain("councilor@city.com");
    });

    it("200 returns empty array when no municipality users exist", async () => {
      const response = await adminAgent
        .get(`${base}/municipality-users`)
        .expect(200);

      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBe(0);
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

      // Check specific roles exist (using seeded roles from database)
      const roleNames = response.body.map((role: any) => role.name);
      expect(roleNames.length).toBeGreaterThan(0);
      // Just check that we have roles from the seeded list
      expect(roleNames).toContain("municipal public relations officer");
      expect(roleNames).toContain("municipal administrator");
    });



    it("403 when non-admin authenticated", async () => {
      // Create a citizen user and try to access roles
      const citizenUser = {
        username: "citizen_access_roles",
        email: "citizen_roles@example.com",
        firstName: "Citizen",
        lastName: "Roles",
        password: "citizenpass123",
      };

      const citizenAgent = request.agent(app);
      await citizenAgent.post("/api/users").send(citizenUser).expect(201);
      await citizenAgent
        .post("/api/auth/session")
        .send({
          identifier: citizenUser.email,
          password: citizenUser.password,
          role: "CITIZEN",
        })
        .expect(200);

      await citizenAgent.get(`${base}/municipality-users/roles`).expect(403);
    });


  });


});
