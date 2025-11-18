import { prisma } from "@database";
import { roleRepository } from "@repositories/roleRepository";

type PrismaMock = {
  municipality_role: {
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    delete: jest.Mock;
  };
};

const prismaMock = prisma as unknown as PrismaMock;

const makeMunicipalityRole = (overrides: Partial<any> = {}) => ({
  id: 1,
  name: "Organization Office",
  ...overrides,
});

describe("roleRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------- createMunicipalityRole --------
  describe("createMunicipalityRole", () => {
    it("creates a new municipality role", async () => {
      const roleData = { name: "Test Role" };
      const created = makeMunicipalityRole(roleData);
      prismaMock.municipality_role.create.mockResolvedValue(created);

      const result = await roleRepository.createMunicipalityRole(roleData.name);

      expect(prismaMock.municipality_role.create).toHaveBeenCalledWith({
        data: { name: roleData.name },
      });
      expect(result).toBe(created);
    });
  });

  // -------- getAllMunicipalityRoles --------
  describe("getAllMunicipalityRoles", () => {
    it("returns all municipality roles", async () => {
      const roles = [
        makeMunicipalityRole({ id: 1, name: "Organization Office" }),
        makeMunicipalityRole({ id: 2, name: "Technical Office" }),
      ];
      prismaMock.municipality_role.findMany.mockResolvedValue(roles);

      const result = await roleRepository.getAllMunicipalityRoles();

      expect(prismaMock.municipality_role.findMany).toHaveBeenCalledTimes(1);
      expect(result).toEqual(roles);
    });
  });

  // -------- findMunicipalityRoleById --------
  describe("findMunicipalityRoleById", () => {
    it("returns role when found", async () => {
      const role = makeMunicipalityRole({ id: 42 });
      prismaMock.municipality_role.findUnique.mockResolvedValue(role);

      const result = await roleRepository.findMunicipalityRoleById(42);

      expect(prismaMock.municipality_role.findUnique).toHaveBeenCalledWith({
        where: { id: 42 },
      });
      expect(result).toBe(role);
    });

    it("returns null when role not found", async () => {
      prismaMock.municipality_role.findUnique.mockResolvedValue(null);

      const result = await roleRepository.findMunicipalityRoleById(999);

      expect(prismaMock.municipality_role.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
      });
      expect(result).toBeNull();
    });
  });

  // -------- findMunicipalityRoleByName --------
  describe("findMunicipalityRoleByName", () => {
    it("returns role when found", async () => {
      const role = makeMunicipalityRole({ name: "Test Role" });
      prismaMock.municipality_role.findUnique.mockResolvedValue(role);

      const result =
        await roleRepository.findMunicipalityRoleByName("Test Role");

      expect(prismaMock.municipality_role.findUnique).toHaveBeenCalledWith({
        where: { name: "Test Role" },
      });
      expect(result).toBe(role);
    });

    it("returns null when role not found", async () => {
      prismaMock.municipality_role.findUnique.mockResolvedValue(null);

      const result =
        await roleRepository.findMunicipalityRoleByName("Non-existent Role");

      expect(prismaMock.municipality_role.findUnique).toHaveBeenCalledWith({
        where: { name: "Non-existent Role" },
      });
      expect(result).toBeNull();
    });
  });

  // -------- deleteMunicipalityRoleById --------
  describe("deleteMunicipalityRoleById", () => {
    it("deletes role by id", async () => {
      const deleted = makeMunicipalityRole({ id: 7 });
      prismaMock.municipality_role.delete.mockResolvedValue(deleted);

      const result = await roleRepository.deleteMunicipalityRoleById(7);

      expect(prismaMock.municipality_role.delete).toHaveBeenCalledWith({
        where: { id: 7 },
      });
      expect(result).toBe(deleted);
    });

    it("propagates delete errors", async () => {
      const err = new Error("Role is referenced by users");
      prismaMock.municipality_role.delete.mockRejectedValue(err);

      await expect(roleRepository.deleteMunicipalityRoleById(1)).rejects.toBe(
        err,
      );
    });
  });
});
