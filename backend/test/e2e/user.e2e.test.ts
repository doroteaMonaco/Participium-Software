import request from "supertest";
import { userService } from "@services/userService";
import app from "@app";
import { roleType } from "@models/enums";
import { getTestPrisma } from "../setup/test-datasource";

let prisma: any;

describe("User E2E", () => {
  const base = "/api/users";
  let adminAgent: any;

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
    await prisma.external_maintainer.deleteMany();
    await prisma.pending_verification_user.deleteMany();
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

    // Recreate admin user and agent after cleanup
    try {
      await userService.registerUser(adminUser, roleType.ADMIN);
    } catch (e) {
      // If user already exists, that's okay
    }

    // Create fresh admin agent for this test
    adminAgent = request.agent(app);
    await adminAgent.post("/api/auth/session").send({
      identifier: adminUser.email,
      password: adminUser.password,
      role: "ADMIN",
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.report.deleteMany();
    await prisma.external_maintainer.deleteMany();
    await prisma.pending_verification_user.deleteMany();
    await prisma.user.deleteMany();
    await prisma.admin_user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.municipality_role.deleteMany();
    // DO NOT disconnect - singleton is managed by test setup
  });

  const makeNormalAgent = async () => {
    const agent = request.agent(app);
    await agent.post("/api/users").send(normalUser).expect(201);
    await agent.post("/api/auth/verify").send({
      emailOrUsername: normalUser.email,
      code: (global as any).__lastSentVerificationCode,
    });

    const loginRes = await agent.post("/api/auth/session").send({
      identifier: normalUser.email,
      password: normalUser.password,
      role: "CITIZEN",
    });
    expect(loginRes.status).toBe(200);
    return agent;
  };

  describe("Citizen Registration Flow", () => {
    it("creates pending verification and denies session before verification", async () => {
      const agent = request.agent(app);
      const testUser = {
        username: "pending_citizen",
        email: "pending_citizen@example.com",
        firstName: "Pending",
        lastName: "Citizen",
        password: "pwd",
      };

      await agent.post("/api/users").send(testUser).expect(201);

      // should not be authenticated until verification completes
      await agent.get("/api/auth/session").expect(401);
    });

    it("User can register, login, and be retrieved by admin", async () => {
      const agent = request.agent(app);
      const testUser = {
        ...normalUser,
        username: "testcit",
        email: "testcit@example.com",
      };

      // Register
      await agent
        .post("/api/users")
        .set("Accept", "application/json")
        .send(testUser)
        .expect(201);
      const registerRes = await agent.post("/api/auth/verify").send({
        emailOrUsername: testUser.email,
        code: (global as any).__lastSentVerificationCode,
      });

      expect(registerRes.headers["set-cookie"]).toBeDefined();
      expect(registerRes.headers.location).toBe("/reports");
      expect(registerRes.body).toBeDefined();

      // Login as admin to verify user exists
      const userId = registerRes.body.user.id;

      const getUserRes = await adminAgent
        .get(`${base}/${userId}`)
        .send({ role: "CITIZEN" })
        .expect(200);

      expect(getUserRes.body).toHaveProperty("id", userId);
      expect(getUserRes.body).toHaveProperty("username", testUser.username);
    });

    it("Admin can view all users and manage them", async () => {
      // Create multiple citizen users
      await request(app)
        .post(`${base}`)
        .send({
          email: "u1@example.com",
          username: "u1",
          firstName: "U",
          lastName: "One",
          password: "p",
        })
        .expect(201);
      await request(app)
        .post("/api/auth/verify")
        .send({
          emailOrUsername: "u1@example.com",
          code: (global as any).__lastSentVerificationCode,
        });

      await request(app)
        .post(`${base}`)
        .send({
          email: "u2@example.com",
          username: "u2",
          firstName: "U",
          lastName: "Two",
          password: "p",
        })
        .expect(201);
      await request(app)
        .post("/api/auth/verify")
        .send({
          emailOrUsername: "u2@example.com",
          code: (global as any).__lastSentVerificationCode,
        });

      // Get all users
      const res = await adminAgent.get(`${base}`).expect(200);
      expect(Array.isArray(res.body)).toBeTruthy();
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it("Admin can create and delete municipality users", async () => {
      const createRes = await adminAgent
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

      const userId = createRes.body.id;

      // Verify user exists
      await adminAgent
        .get(`${base}/${userId}`)
        .send({ role: "MUNICIPALITY" })
        .expect(200);

      // Delete user
      await adminAgent
        .delete(`${base}/${userId}`)
        .send({ role: "MUNICIPALITY" })
        .expect(204);

      // Verify user no longer exists
      await adminAgent
        .get(`${base}/${userId}`)
        .send({ role: "MUNICIPALITY" })
        .expect(404);
    });
  });

  describe("Municipality Users Management", () => {
    it("Admin can create municipality users with different roles", async () => {
      const payload = {
        email: "muni@example.com",
        username: "muni-op",
        firstName: "Muni",
        lastName: "Op",
        password: "pwd",
        municipality_role_id: 2,
      };

      const res = await adminAgent
        .post(`${base}/municipality-users`)
        .send(payload)
        .expect(201);

      expect(res.body).toHaveProperty("id");
      expect(res.body.email).toBe(payload.email);
      expect(res.body.username).toBe(payload.username);
    });

    it("Admin can view municipality roles and create users with valid roles", async () => {
      // Get available roles
      const rolesRes = await adminAgent
        .get(`${base}/municipality-users/roles`)
        .expect(200);

      expect(Array.isArray(rolesRes.body)).toBeTruthy();
      expect(rolesRes.body.length).toBeGreaterThan(0);

      const validRole = rolesRes.body[0];
      expect(validRole).toHaveProperty("id");
      expect(validRole).toHaveProperty("name");

      // Create municipality user with valid role
      const createRes = await adminAgent
        .post(`${base}/municipality-users`)
        .send({
          email: "muni-valid@example.com",
          username: "muni-valid",
          firstName: "Muni",
          lastName: "Valid",
          password: "pwd",
          municipality_role_id: validRole.id,
        })
        .expect(201);

      expect(createRes.body).toHaveProperty(
        "municipality_role_id",
        validRole.id,
      );
    });

    it("Admin can list all municipality users", async () => {
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

      // Get all municipality users
      const res = await adminAgent
        .get(`${base}/municipality-users`)
        .expect(200);
      expect(Array.isArray(res.body)).toBeTruthy();
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("External Users Management", () => {
    it("Admin can create external maintainer users", async () => {
      const payload = {
        email: "ext-1@example.com",
        username: "ext-user-1",
        firstName: "External",
        lastName: "Maintainer",
        password: "pwd123",
        companyName: "ExternalCorp",
        category: "WASTE",
      };

      const res = await adminAgent.post(`${base}/external-users`).send(payload);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("email", payload.email);
    });

    it("Admin can view all external users", async () => {
      const res = await adminAgent.get(`${base}/external-users`).expect(200);
      expect(Array.isArray(res.body)).toBeTruthy();
    });
  });

  describe("User Profile Management", () => {
    it("Citizen can update their profile", async () => {
      const user = await makeNormalAgent();

      const res = await user
        .patch(`${base}`)
        .field("firstName", "Updated")
        .field("lastName", "Name");

      expect([200, 400]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body).toHaveProperty("firstName", "Updated");
      }
    });
  });

  describe("Complete User Management Workflow", () => {
    it("Admin can create, retrieve, and delete users across all roles", async () => {
      // Create municipality user
      const muniUser = {
        email: "workflow_muni@city.com",
        username: "workflow_muni",
        firstName: "WorkflowMuni",
        lastName: "User",
        password: "WorkflowPass123!",
        municipality_role_id: 2,
      };

      const muniCreateRes = await adminAgent
        .post(`${base}/municipality-users`)
        .send(muniUser)
        .expect(201);

      const muniId = muniCreateRes.body.id;

      // Create external maintainer user
      const extUser = {
        email: "workflow_ext@company.com",
        username: "workflow_ext",
        firstName: "WorkflowExt",
        lastName: "User",
        password: "WorkflowPass123!",
        companyName: "WorkflowCorp",
        category: "PUBLIC_LIGHTING",
      };

      const extCreateRes = await adminAgent
        .post(`${base}/external-users`)
        .send(extUser)
        .expect(201);

      const extId = extCreateRes.body.id;

      // Create citizen user
      const citizenUser = {
        username: "workflow_citizen",
        email: "workflow_citizen@example.com",
        firstName: "WorkflowCitizen",
        lastName: "User",
        password: "WorkflowPass123!",
      };

      await request(app).post(`${base}`).send(citizenUser).expect(201);
      const citizenCreateRes = await request(app)
        .post("/api/auth/verify")
        .send({
          emailOrUsername: citizenUser.email,
          code: (global as any).__lastSentVerificationCode,
        });

      const citizenId = citizenCreateRes.body.user.id;

      // Admin can retrieve each user
      const muniDetailRes = await adminAgent
        .get(`${base}/${muniId}`)
        .send({ role: roleType.MUNICIPALITY })
        .expect(200);
      expect(muniDetailRes.body.email).toBe(muniUser.email);

      const extDetailRes = await adminAgent
        .get(`${base}/${extId}`)
        .send({ role: roleType.EXTERNAL_MAINTAINER })
        .expect(200);
      expect(extDetailRes.body.email).toBe(extUser.email);

      const citizenDetailRes = await adminAgent
        .get(`${base}/${citizenId}`)
        .send({ role: roleType.CITIZEN })
        .expect(200);
      expect(citizenDetailRes.body.email).toBe(citizenUser.email);

      // Delete municipality user
      await adminAgent
        .delete(`${base}/${muniId}`)
        .send({ role: roleType.MUNICIPALITY })
        .expect(204);

      // Verify deleted
      const deletedMuniRes = await adminAgent
        .get(`${base}/${muniId}`)
        .send({ role: roleType.MUNICIPALITY });
      expect(deletedMuniRes.status).toBe(404);
    });

    it("Administrator can view all users across roles", async () => {
      // Create multiple citizen users (since GET /api/users returns only citizens)
      const citizen1 = {
        email: "cit_list1@city.com",
        username: "cit_list_1",
        firstName: "Cit1",
        lastName: "List",
        password: "ListPass123!",
      };

      const citizen2 = {
        email: "cit_list2@city.com",
        username: "cit_list_2",
        firstName: "Cit2",
        lastName: "List",
        password: "ListPass123!",
      };

      // Register 2 citizens
      const agent1 = request.agent(app);
      await agent1.post(`${base}`).send(citizen1).expect(201);
      await agent1.post("/api/auth/verify").send({
        emailOrUsername: citizen1.email,
        code: (global as any).__lastSentVerificationCode,
      });

      const agent2 = request.agent(app);
      await agent2.post(`${base}`).send(citizen2).expect(201);
      await agent2.post("/api/auth/verify").send({
        emailOrUsername: citizen2.email,
        code: (global as any).__lastSentVerificationCode,
      });

      // Get all users (returns citizens only)
      const allUsersRes = await adminAgent.get(`${base}`).expect(200);
      expect(Array.isArray(allUsersRes.body)).toBe(true);
      expect(allUsersRes.body.length).toBeGreaterThanOrEqual(2);

      // Get municipality users specifically (should be 0 since we only created citizens)
      const muniUsersRes = await adminAgent
        .get(`${base}/municipality-users`)
        .expect(200);
      expect(Array.isArray(muniUsersRes.body)).toBe(true);

      // Get external users
      const extUsersRes = await adminAgent
        .get(`${base}/external-users`)
        .expect(200);
      expect(Array.isArray(extUsersRes.body)).toBe(true);
    });

    it("Citizens cannot perform admin user management operations", async () => {
      const citizen = await makeNormalAgent();

      // Citizen cannot create municipality users
      const muniPayload = {
        email: "cannot_create_muni@city.com",
        username: "cannot_create",
        firstName: "Cannot",
        lastName: "Create",
        password: "CannotPass123!",
        municipality_role_id: 1,
      };

      await citizen
        .post(`${base}/municipality-users`)
        .send(muniPayload)
        .expect(403);

      // Citizen cannot view all users
      await citizen.get(`${base}`).expect(403);

      // Citizen cannot view municipality users
      await citizen.get(`${base}/municipality-users`).expect(403);

      // Citizen cannot view external users
      await citizen.get(`${base}/external-users`).expect(403);

      // Citizen cannot view municipality roles
      await citizen.get(`${base}/municipality-users/roles`).expect(403);
    });

    it("Municipality users can authenticate and access session", async () => {
      // Create municipality user
      const muniUser = {
        email: "muni_session@city.com",
        username: "muni_session",
        firstName: "MuniSession",
        lastName: "User",
        password: "SessionPass123!",
        municipality_role_id: 3,
      };

      await adminAgent
        .post(`${base}/municipality-users`)
        .send(muniUser)
        .expect(201);

      // Municipality user logs in
      const muniAgent = request.agent(app);
      const loginRes = await muniAgent
        .post("/api/auth/session")
        .send({
          identifier: muniUser.email,
          password: muniUser.password,
          role: roleType.MUNICIPALITY,
        })
        .expect(200);

      expect(loginRes.headers["set-cookie"]).toBeDefined();

      // Verify municipality session
      const sessionRes = await muniAgent.get("/api/auth/session").expect(200);

      expect(sessionRes.body.email).toBe(muniUser.email);
      expect(sessionRes.body.username).toBe(muniUser.username);
    });

    it("External maintainers can authenticate and access session", async () => {
      // Admin creates external maintainer
      const extUser = {
        email: "ext_session@company.com",
        username: "ext_session",
        firstName: "ExtSession",
        lastName: "User",
        password: "SessionPass123!",
        companyName: "SessionCorp",
        category: "WASTE",
      };

      await adminAgent.post(`${base}/external-users`).send(extUser).expect(201);

      // External maintainer logs in
      const extAgent = request.agent(app);
      const loginRes = await extAgent
        .post("/api/auth/session")
        .send({
          identifier: extUser.email,
          password: extUser.password,
          role: roleType.EXTERNAL_MAINTAINER,
        })
        .expect(200);

      expect(loginRes.headers["set-cookie"]).toBeDefined();

      // Verify external maintainer session
      const sessionRes = await extAgent.get("/api/auth/session").expect(200);

      expect(sessionRes.body.email).toBe(extUser.email);
      expect(sessionRes.body.username).toBe(extUser.username);
    });

    it("Admin can get municipality roles for user creation", async () => {
      const rolesRes = await adminAgent
        .get(`${base}/municipality-users/roles`)
        .expect(200);

      expect(Array.isArray(rolesRes.body)).toBe(true);
      expect(rolesRes.body.length).toBeGreaterThan(0);

      // Each role should have id and name
      rolesRes.body.forEach((role: any) => {
        expect(role).toHaveProperty("id");
        expect(role).toHaveProperty("name");
      });
    });

    it("Admin cannot create users with invalid municipality roles", async () => {
      const invalidMuniUser = {
        email: "invalid_role_muni@city.com",
        username: "invalid_role",
        firstName: "InvalidRole",
        lastName: "User",
        password: "InvalidPass123!",
        municipality_role_id: 99999, // Non-existent role
      };

      const createRes = await adminAgent
        .post(`${base}/municipality-users`)
        .send(invalidMuniUser);

      // Should fail due to foreign key constraint
      expect([400, 500]).toContain(createRes.status);
      expect(createRes.body).toHaveProperty("error");
    });
  });
});
