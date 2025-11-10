import { prisma } from '../database/connection';


export const userRepository = {
  async createUser(email: string, username: string, firstName: string, lastName: string, password: string) {
    return prisma.user.create({
      data: {
        username,
        email,
        firstName,
        lastName,
        password,
      },
    });
  },

  async findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  },

  async findUserByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username },
    });
  },

  async findUserById(id: number) {
    return prisma.user.findUnique({
      where: { id },
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
  },

  async createUserWithRole(
    email: string, 
    username: string, 
    firstName: string, 
    lastName: string, 
    password: string,
    role: string,
    municipality_role_id?: number
  ) {
    return prisma.user.create({
      data: {
        username,
        email,
        firstName,
        lastName,
        password,
        role: role as any,
        municipality_role_id: municipality_role_id,
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
  },

  async getAllUsers() {
    return prisma.user.findMany({
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
  },

  async deleteUser(userId: number) {
    return prisma.user.delete({
      where: { id: userId },
    });
  },
};