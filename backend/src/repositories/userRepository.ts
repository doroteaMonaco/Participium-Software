import { prisma } from "@database";
import { roleType } from "@models/enums";
import { roleType as PrismaRole } from "@prisma/client";

export const userRepository = {
  async createUser(
    email: string,
    username: string,
    firstName: string,
    lastName: string,
    password: string,
  ) {
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
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        municipality_role_id: true,
        municipality_role: true,
        profilePhoto: true,
        telegramUsername: true,
        notifications: true,
      },
    });
  },

  async findUserByUsername(username: string) {
    return prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        municipality_role_id: true,
        municipality_role: true,
        profilePhoto: true,
        telegramUsername: true,
        notifications: true,
      },
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
        profilePhoto: true,
        telegramUsername: true,
        notifications: true,
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
    municipality_role_id?: number,
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
        profilePhoto: true,
        telegramUsername: true,
        notifications: true,
      },
    });
  },

  async deleteUser(userId: number) {
    return prisma.user.delete({
      where: { id: userId },
    });
  },

  async getUsersByRole(role: roleType | PrismaRole) {
    // ensure value is the Prisma enum type before querying
    const prismaRole = role as PrismaRole;
    return prisma.user.findMany({
      where: { role: prismaRole },
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
        profilePhoto: true,
        telegramUsername: true,
        notifications: true,
      },
    });
  },

  async updateUserProfile(
    id: number,
    telegramUsername?: string,
    notifications?: boolean,
    profilePhotoPath?: string,
  ) {
    const data: any = {};
    if (telegramUsername !== undefined) {
      data.telegramUsername = telegramUsername;
    }
    if (notifications !== undefined) {
      data.notifications = notifications;
    }
    if (profilePhotoPath !== undefined) {
      data.profilePhoto = profilePhotoPath;
    }
    return prisma.user.update({
      where: { id },
      data,
    });
  },
};
