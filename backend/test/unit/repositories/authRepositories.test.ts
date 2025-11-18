jest.mock("@database", () => ({
  prisma: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { userRepository } from "@repositories/userRepository";
import { prisma } from "@database";

type PrismaMock = {
  user: {
    create: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    delete: jest.Mock;
  };
};

const prismaMock = prisma as unknown as PrismaMock;

const makeUser = (overrides: Partial<any> = {}) => ({
  id: 1,
  email: "mario.rossi@example.com",
  username: "mrossi",
  firstName: "Mario",
  lastName: "Rossi",
  password: "hashed",
  ...overrides,
});

describe("userRepository", () => {
  beforeEach(() => {
    prismaMock.user.create.mockReset();
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.findMany.mockReset();
    prismaMock.user.delete.mockReset();
  });

  describe("createUser", () => {
    it("create user correctly", async () => {
      const u = makeUser();
      prismaMock.user.create.mockResolvedValue(u);

      const res = await userRepository.createUser(
        u.email,
        u.username,
        u.firstName,
        u.lastName,
        u.password,
      );

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          username: u.username,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          password: u.password,
        },
      });
      expect(res).toBe(u);
    });
  });

  describe("findUserByEmail", () => {
    it("return user", async () => {
      const u = makeUser();
      prismaMock.user.findUnique.mockResolvedValue(u);

      const res = await userRepository.findUserByEmail(u.email);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: u.email },
      });
      expect(res).toBe(u);
    });

    it("return null if not found", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await userRepository.findUserByEmail("missing@example.com");
      expect(res).toBeNull();
    });
  });

  describe("findUserByUsername", () => {
    it("call where: { username }", async () => {
      const u = makeUser();
      prismaMock.user.findUnique.mockResolvedValue(u);

      const res = await userRepository.findUserByUsername(u.username);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { username: u.username },
      });
      expect(res).toBe(u);
    });

    it("return null if not found", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await userRepository.findUserByUsername("ghost");
      expect(res).toBeNull();
    });
  });

  describe("findUserById", () => {
    it("call where: { id }", async () => {
      const u = makeUser({ id: 42 });
      prismaMock.user.findUnique.mockResolvedValue(u);

      const res = await userRepository.findUserById(42);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 42 },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          municipality_role_id: true,
          municipality_role: true,
        },
      });
      expect(res).toBe(u);
    });

    it("return null if not found", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await userRepository.findUserById(999);
      expect(res).toBeNull();
    });
  });

  describe("createUserWithRole", () => {
    it("creates user with role and select fields", async () => {
      const created = makeUser({ id: 10, role: "MUNICIPALITY" });
      prismaMock.user.create.mockResolvedValue(created);

      const res = await userRepository.createUserWithRole(
        created.email,
        created.username,
        created.firstName,
        created.lastName,
        "hashed-pwd",
        "MUNICIPALITY",
        3,
      );

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          username: created.username,
          email: created.email,
          firstName: created.firstName,
          lastName: created.lastName,
          password: "hashed-pwd",
          role: "MUNICIPALITY",
          municipality_role_id: 3,
        },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          municipality_role_id: true,
          municipality_role: true,
        },
      });

      expect(res).toBe(created);
    });

    it("creates user with role when municipality_role_id is undefined", async () => {
      const created = makeUser({ id: 11 });
      prismaMock.user.create.mockResolvedValue(created);

      const res = await userRepository.createUserWithRole(
        created.email,
        created.username,
        created.firstName,
        created.lastName,
        "hashed-pwd",
        "MUNICIPALITY",
      );

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          username: created.username,
          email: created.email,
          firstName: created.firstName,
          lastName: created.lastName,
          password: "hashed-pwd",
          role: "MUNICIPALITY",
          municipality_role_id: undefined,
        },
        select: expect.any(Object),
      });

      expect(res).toBe(created);
    });
  });

  describe("getAllUsers", () => {
    it("returns all users", async () => {
      const users = [makeUser(), makeUser({ id: 2 })];
      prismaMock.user.findMany.mockResolvedValue(users);

      const res = await userRepository.getAllUsers();

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          municipality_role_id: true,
          municipality_role: true,
        },
      });
      expect(res).toBe(users);
    });

    it("returns empty array if no user", async () => {
      const users: any[] = [];
      prismaMock.user.findMany.mockResolvedValue(users);

      const res = await userRepository.getAllUsers();

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          municipality_role_id: true,
          municipality_role: true,
        },
      });
      expect(res).toBe(users);
    });
  });

  describe("deleteUser", () => {
    it("calls prisma.delete with given id and returns result", async () => {
      const deleted = makeUser({ id: 5 });
      prismaMock.user.delete.mockResolvedValue(deleted);

      const res = await userRepository.deleteUser(5);

      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: 5 },
      });
      expect(res).toBe(deleted);
    });
  });

  describe("getUsersByRole", () => {
    it("calls prisma.findMany with provided Prisma role string and returns users", async () => {
      const users = [makeUser(), makeUser({ id: 2 })];
      prismaMock.user.findMany.mockResolvedValue(users);

      const res = await userRepository.getUsersByRole("MUNICIPALITY");

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { role: "MUNICIPALITY" },
        include: { municipality_role: true },
      });
      expect(res).toBe(users);
    });

    it("accepts custom role value and forwards it to prisma (type-cast branch)", async () => {
      const users = [makeUser({ id: 3, role: "ADMIN" })];
      prismaMock.user.findMany.mockResolvedValue(users);

      const res = await userRepository.getUsersByRole("ADMIN" as any);

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { role: "ADMIN" },
        include: { municipality_role: true },
      });
      expect(res).toBe(users);
    });
  });
});
