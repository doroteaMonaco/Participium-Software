import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authRepository = {
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
};