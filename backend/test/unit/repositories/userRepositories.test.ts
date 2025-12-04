jest.mock("@database", () => ({
  prisma: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
    municipality_user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    admin_user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { userRepository } from "@repositories/userRepository";
import { prisma } from "@database";
import { roleType } from "@models/enums";

type PrismaMock = {
  user: {
    create: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    delete: jest.Mock;
    update: jest.Mock;
  };
  municipality_user: {
    create: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    delete: jest.Mock;
  };
  admin_user: {
    create: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
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
  createdAt: new Date(),
  ...overrides,
});

describe("userRepository", () => {
  beforeEach(() => {
    // user mocks
    prismaMock.user.create.mockReset();
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.findMany.mockReset();
    prismaMock.user.findFirst.mockReset();
    prismaMock.user.delete.mockReset();
    prismaMock.user.update.mockReset();
    // municipality_user mocks
    prismaMock.municipality_user.create.mockReset();
    prismaMock.municipality_user.findUnique.mockReset();
    prismaMock.municipality_user.findMany.mockReset();
    prismaMock.municipality_user.findFirst.mockReset();
    prismaMock.municipality_user.delete.mockReset();
    // admin_user mocks
    prismaMock.admin_user.create.mockReset();
    prismaMock.admin_user.findUnique.mockReset();
    prismaMock.admin_user.findMany.mockReset();
    prismaMock.admin_user.findFirst.mockReset();
    prismaMock.admin_user.delete.mockReset();
  });

  const baseSelect = {
    id: true,
    username: true,
    email: true,
    firstName: true,
    lastName: true,
    createdAt: true,
  };

  const roleSelectMap: Record<roleType, any> = {
    [roleType.CITIZEN]: {
      profilePhoto: true,
      telegramUsername: true,
      notifications: true,
    },
    [roleType.MUNICIPALITY]: {
      municipality_role_id: true,
      municipality_role: true,
    },
    [roleType.ADMIN]: {},
  };

  const selectMatcher = (role: roleType, needPass: boolean = false) => {
    const extra = { ...(roleSelectMap[role] ?? {}) };
    if (needPass) extra.password = true;
    return expect.objectContaining({ ...baseSelect, ...extra });
  };

  describe("createUser", () => {
    it("create user correctly (default citizen table)", async () => {
      const u = makeUser();
      prismaMock.user.create.mockResolvedValue(u);

      await userRepository.createUser(
        u.email,
        u.username,
        u.firstName,
        u.lastName,
        u.password,
      );

      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            username: u.username,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
            password: u.password,
          }),
          select: selectMatcher(roleType.CITIZEN),
        }),
      );
    });

    it("creates user with municipality role and select fields (uses municipality_user table)", async () => {
      const created = makeUser({ id: 10 });
      prismaMock.municipality_user.create.mockResolvedValue(created);

      await userRepository.createUser(
        created.email,
        created.username,
        created.firstName,
        created.lastName,
        "hashed-pwd",
        roleType.MUNICIPALITY,
        { municipality_role_id: 1 },
      );

      expect(prismaMock.municipality_user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: created.email,
            username: created.username,
            firstName: created.firstName,
            lastName: created.lastName,
            password: "hashed-pwd",
            municipality_role_id: 1,
          }),
          select: selectMatcher(roleType.MUNICIPALITY),
        }),
      );
    });

    it("creates municipality user when municipality_role_id is not provided", async () => {
      const created = makeUser({ id: 11 });
      prismaMock.municipality_user.create.mockResolvedValue(created);

      const res = await userRepository.createUser(
        created.email,
        created.username,
        created.firstName,
        created.lastName,
        "hashed-pwd",
        roleType.MUNICIPALITY,
      );

      expect(prismaMock.municipality_user.create).toHaveBeenCalledWith({
        data: {
          username: created.username,
          email: created.email,
          firstName: created.firstName,
          lastName: created.lastName,
          password: "hashed-pwd",
        },
        select: selectMatcher(roleType.MUNICIPALITY),
      });

      expect(res).toBeDefined();
    });
  });

  describe("findUserByEmail", () => {
    it("return user (select includes password and citizen extras)", async () => {
      const u = makeUser();
      prismaMock.user.findUnique.mockResolvedValue(u);

      const res = await userRepository.findUserByEmail(u.email);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: u.email },
          select: selectMatcher(roleType.CITIZEN, true),
        }),
      );

      expect(res).toEqual(u);
    });

    it("return null if not found", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await userRepository.findUserByEmail("missing@example.com");
      expect(res).toBeNull();
    });
  });

  describe("findUserByUsername", () => {
    it("call where: { username } and select password + citizen extras", async () => {
      const u = makeUser();
      prismaMock.user.findUnique.mockResolvedValue(u);

      const res = await userRepository.findUserByUsername(u.username);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { username: u.username },
          select: selectMatcher(roleType.CITIZEN, true),
        }),
      );

      expect(res).toBeDefined();
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

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 42 },
          select: selectMatcher(roleType.CITIZEN),
        }),
      );

      expect(res).toBeDefined();
    });

    it("return null if not found", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await userRepository.findUserById(999);
      expect(res).toBeNull();
    });
  });

  describe("getAllUsers", () => {
    it("returns all users (citizen select includes extras)", async () => {
      const users = [makeUser(), makeUser({ id: 2 })];
      prismaMock.user.findMany.mockResolvedValue(users);

      const res = await userRepository.getAllUsers();

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: selectMatcher(roleType.CITIZEN),
        }),
      );
      expect(res).toBeDefined();
    });

    it("returns empty array if no user", async () => {
      const users: any[] = [];
      prismaMock.user.findMany.mockResolvedValue(users);

      const res = await userRepository.getAllUsers();

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: selectMatcher(roleType.CITIZEN),
        }),
      );
      expect(res).toEqual(users);
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
      expect(res).toEqual(deleted);
    });
  });

  describe("getUsersByRole", () => {
    it("calls prisma.findMany with provided Prisma role string and returns users (municipality)", async () => {
      const users = [makeUser(), makeUser({ id: 2 })];
      prismaMock.municipality_user.findMany.mockResolvedValue(users);

      const res = await userRepository.getUsersByRole(roleType.MUNICIPALITY);

      expect(prismaMock.municipality_user.findMany).toHaveBeenCalledWith({
        select: selectMatcher(roleType.MUNICIPALITY),
      });
      expect(res).toEqual(users);
    });

    it("accepts custom role value and forwards it to prisma (type-cast branch) - admin", async () => {
      const users = [makeUser({ id: 3 })];
      prismaMock.admin_user.findMany.mockResolvedValue(users);

      const res = await userRepository.getUsersByRole(roleType.ADMIN);

      expect(prismaMock.admin_user.findMany).toHaveBeenCalledWith({
        select: selectMatcher(roleType.ADMIN),
      });
      expect(res).toEqual(users);
    });
  });

  describe("findLeastLoadedOfficerByOfficeName", () => {
    it("queries officers by office name ordered by assigned report count", async () => {
      const officer = makeUser({ id: 9 });
      prismaMock.municipality_user.findFirst.mockResolvedValue(officer);

      const res =
        await userRepository.findLeastLoadedOfficerByOfficeName("Public Works");

      expect(prismaMock.municipality_user.findFirst).toHaveBeenCalledWith({
        where: {
          municipality_role: {
            name: "Public Works",
          },
        },
        orderBy: {
          assignedReports: {
            _count: "asc",
          },
        },
      });
      expect(res).toEqual(officer);
    });

    it("returns null when no matching officer is found", async () => {
      prismaMock.municipality_user.findFirst.mockResolvedValue(null);

      const res =
        await userRepository.findLeastLoadedOfficerByOfficeName("Ghost Office");

      expect(prismaMock.municipality_user.findFirst).toHaveBeenCalledWith({
        where: {
          municipality_role: {
            name: "Ghost Office",
          },
        },
        orderBy: {
          assignedReports: {
            _count: "asc",
          },
        },
      });
      expect(res).toBeNull();
    });
  });
});
