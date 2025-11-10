import { prisma } from '../database/connection';


export const roleRepository = {
  async createMunicipalityRole(name: string) {
    return prisma.municipality_role.create({
      data: {
        name
      },
    });
  },

  async getAllMunicipalityRoles(){
    return prisma.municipality_role.findMany();
  },

  async findMunicipalityRoleById(id: number) {
    return prisma.municipality_role.findUnique({
      where: { id },
    });
  },

  async findMunicipalityRoleByName(name: string) {
    return prisma.municipality_role.findUnique({
      where: { name },
    });
  },

  async deleteMunicipalityRoleById(id: number) {
    // Database will automatically prevent deletion if users reference this role (ON DELETE RESTRICT)
    return prisma.municipality_role.delete({
      where: { id },
    });
  },
}