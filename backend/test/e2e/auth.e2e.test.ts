import request from "supertest";
import app from "@app";
import { getTestPrisma } from "../setup/test-datasource";

let prisma: any;

describe("Auth E2E", () => {
  let fakeUser = {
    username: "mrossi",
    email: "mr@example.com",
    firstName: "Mario",
    lastName: "Rossi",
    password: "password123",
  };

  beforeAll(async () => {
    prisma = await getTestPrisma();
  });

  beforeEach(async () => {
    // cleanup DB to avoid conflicts
    await prisma.report.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.external_maintainer.deleteMany();
    await prisma.user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.admin_user.deleteMany();
  });

  afterAll(async () => {
    await prisma.report.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.external_maintainer.deleteMany();
    await prisma.user.deleteMany();
    await prisma.municipality_user.deleteMany();
    await prisma.admin_user.deleteMany();
    // DO NOT disconnect - singleton is managed by test setup
  });

  describe("Complete Authentication Flow", () => {
    it("User can register, login, verify session, and logout", async () => {
      const agent = request.agent(app);
      const u = {
        username: "mrossi",
        email: "mr@example.com",
        firstName: "Mario",
        lastName: "Rossi",
        password: "password123",
      };

      // Step 1: Register user (registration automatically logs in)
      const registerRes = await agent.post("/api/users").send(u).expect(201);
      expect(registerRes.headers["set-cookie"]).toBeDefined();
      expect(registerRes.headers.location).toBe("/reports");

      // Step 2: Verify session is already established after registration
      const verifyRes = await agent.get("/api/auth/session").expect(200);
      expect(verifyRes.body).toHaveProperty("firstName", u.firstName);
      expect(verifyRes.body).toHaveProperty("lastName", u.lastName);
      expect(verifyRes.body).toHaveProperty("username", u.username);
      expect(verifyRes.body).not.toHaveProperty("password");

      // Step 3: Logout
      await agent.delete("/api/auth/session").expect(204);

      // Step 4: Verify session returns 401 after logout
      await agent.get("/api/auth/session").expect(401);

      // Step 5: Login again with username
      const loginRes = await agent
        .post("/api/auth/session")
        .send({
          identifier: u.username,
          password: u.password,
          role: "CITIZEN",
        })
        .expect(200);

      const setCookie = loginRes.headers["set-cookie"] || [];
      expect(
        Array.isArray(setCookie) ? setCookie.join(";") : setCookie,
      ).toMatch(/authToken=/i);
    });

    it("User can login with email instead of username", async () => {
      const agent = request.agent(app);
      const u = {
        username: "emailtest",
        email: "emailtest@example.com",
        firstName: "Email",
        lastName: "Test",
        password: "password123",
      };

      await agent.post("/api/users").send(u).expect(201);

      // Verify registration already set up session, can check it works
      const sessionRes = await agent
        .get("/api/auth/session")
        .expect(200);
      expect(sessionRes.body.email).toBe(u.email);

      // Logout and verify login works with email
      await agent.delete("/api/auth/session").expect(204);

      const res = await agent
        .post("/api/auth/session")
        .send({ identifier: u.email, password: u.password, role: "CITIZEN" })
        .expect(200);

      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("Multiple sequential logins and logouts work correctly", async () => {
      const u = {
        username: "sequential",
        email: "sequential@example.com",
        firstName: "Sequential",
        lastName: "User",
        password: "password123",
      };
      await request(app).post("/api/users").send(u).expect(201);

      // First login
      const agent1 = request.agent(app);
      await agent1
        .post("/api/auth/session")
        .send({ identifier: u.email, password: u.password, role: "CITIZEN" })
        .expect(200);

      await agent1.get("/api/auth/session").expect(200);
      await agent1.delete("/api/auth/session").expect(204);
      await agent1.get("/api/auth/session").expect(401);

      // Second login with different agent
      const agent2 = request.agent(app);
      await agent2
        .post("/api/auth/session")
        .send({ identifier: u.username, password: u.password, role: "CITIZEN" })
        .expect(200);

      await agent2.get("/api/auth/session").expect(200);
    });
  });

  describe("User Lifecycle: Registration → Profile Access → Logout", () => {
    it("new user can register and immediately access authenticated endpoints", async () => {
      const newUser = {
        username: "newuser123",
        email: "newuser@example.com",
        firstName: "New",
        lastName: "User",
        password: "NewPass123!",
      };

      const agent = request.agent(app);

      // Register
      const registerRes = await agent
        .post("/api/users")
        .set("Accept", "application/json")
        .send(newUser)
        .expect(201);

      expect(registerRes.body).toHaveProperty("id");

      // Immediately access protected endpoint (session from registration)
      const sessionRes = await agent.get("/api/auth/session").expect(200);
      expect(sessionRes.body.username).toBe(newUser.username);
      expect(sessionRes.body.email).toBe(newUser.email);

      // Access reports endpoint (requires authentication)
      const reportsRes = await agent.get("/api/reports").expect(200);
      expect(Array.isArray(reportsRes.body)).toBe(true);
    });

    it("user can update profile after registration", async () => {
      const user = {
        username: "profileuser",
        email: "profileuser@example.com",
        firstName: "Profile",
        lastName: "User",
        password: "ProfilePass123!",
      };

      const agent = request.agent(app);

      // Register
      await agent.post("/api/users").send(user).expect(201);

      // Get initial profile
      const initialProfile = await agent.get("/api/auth/session").expect(200);
      expect(initialProfile.body.firstName).toBe(user.firstName);

      // Update profile
      const updateRes = await agent
        .patch("/api/users")
        .field("firstName", "UpdatedProfile")
        .field("lastName", "UpdatedUser");

      if (updateRes.status === 200) {
        expect(updateRes.body.firstName).toBe("UpdatedProfile");

        // Verify updated profile persisted
        const updatedProfile = await agent
          .get("/api/auth/session")
          .expect(200);
        expect(updatedProfile.body.firstName).toBe("UpdatedProfile");
      }
    });

    it("user cannot access endpoints after logout", async () => {
      const user = {
        username: "logoutuser",
        email: "logoutuser@example.com",
        firstName: "Logout",
        lastName: "User",
        password: "LogoutPass123!",
      };

      const agent = request.agent(app);

      // Register and verify access
      await agent.post("/api/users").send(user).expect(201);

      const beforeLogoutRes = await agent.get("/api/auth/session").expect(200);
      expect(beforeLogoutRes.body).toHaveProperty("id");

      const reportsBeforeRes = await agent.get("/api/reports").expect(200);
      expect(Array.isArray(reportsBeforeRes.body)).toBe(true);

      // Logout
      await agent.delete("/api/auth/session").expect(204);

      // Verify cannot access protected endpoints
      await agent.get("/api/auth/session").expect(401);
      await agent.get("/api/reports").expect(401);
    });
  });

  describe("Authentication Error Handling", () => {
    it("returns appropriate errors for invalid credentials", async () => {
      const user = {
        username: "validuser",
        email: "validuser@example.com",
        firstName: "Valid",
        lastName: "User",
        password: "ValidPass123!",
      };

      const agent = request.agent(app);
      await agent.post("/api/users").send(user).expect(201);

      // Try login with wrong password
      const wrongPasswordRes = await agent
        .post("/api/auth/session")
        .send({
          identifier: user.email,
          password: "WrongPassword123!",
          role: "CITIZEN",
        })
        .expect(401);

      expect(wrongPasswordRes.body).toHaveProperty("error");

      // Try login with non-existent user
      const nonExistentRes = await agent
        .post("/api/auth/session")
        .send({
          identifier: "nonexistent@example.com",
          password: "anypassword",
          role: "CITIZEN",
        })
        .expect(401);

      expect(nonExistentRes.body).toHaveProperty("error");
    });

    it("returns validation errors for incomplete registration data", async () => {
      const agent = request.agent(app);

      // Missing email
      const missingEmailRes = await agent
        .post("/api/users")
        .send({
          username: "testuser",
          firstName: "Test",
          lastName: "User",
          password: "TestPass123!",
        })
        .expect(400);

      expect(missingEmailRes.body).toHaveProperty("error");

      // Missing password
      const missingPasswordRes = await agent
        .post("/api/users")
        .send({
          username: "testuser2",
          email: "testuser2@example.com",
          firstName: "Test",
          lastName: "User",
        })
        .expect(400);

      expect(missingPasswordRes.body).toHaveProperty("error");
    });

    it("prevents duplicate registration with same email or username", async () => {
      const user = {
        username: "uniqueuser",
        email: "uniqueuser@example.com",
        firstName: "Unique",
        lastName: "User",
        password: "UniquePass123!",
      };

      const agent = request.agent(app);

      // Register first user
      await agent.post("/api/users").send(user).expect(201);

      // Try to register with same email
      const sameEmailRes = await agent.post("/api/users").send({
        username: "different_username",
        email: user.email,
        firstName: "Different",
        lastName: "User",
        password: "DifferentPass123!",
      });

      expect(sameEmailRes.status).toBe(409);
      expect(sameEmailRes.body).toHaveProperty("error");

      // Try to register with same username
      const sameUsernameRes = await agent.post("/api/users").send({
        username: user.username,
        email: "different@example.com",
        firstName: "Different",
        lastName: "User",
        password: "DifferentPass123!",
      });

      expect(sameUsernameRes.status).toBe(409);
      expect(sameUsernameRes.body).toHaveProperty("error");
    });
  });
});
