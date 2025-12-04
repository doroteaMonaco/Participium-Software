import { prisma } from "@database";
import { buildParamsObject, throwBadRequestIfMissingObject } from "@utils";
import { roleType } from "@models/enums";
import { AnyUserDto, mapPrismaUserToDto } from "@dto/userDto";
import { AuthenticationError } from "@errors/AuthenticationError";

// Base fields common to all users
const baseSelect = {
  id: true,
  username: true,
  email: true,
  firstName: true,
  lastName: true,
  createdAt: true,
};

/**
 * Select extra fields based on role type
 */
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

const selectExtras = (role: roleType, needPass: boolean = false) => {
  const extra = { ...(roleSelectMap[role] ?? {}) };
  if (needPass) extra.password = true;
  return { ...baseSelect, ...extra };
};

// Get the correct table name based on role
const userTable = (role: roleType) => {
  switch (role) {
    case roleType.CITIZEN:
      return "user";
    case roleType.ADMIN:
      return "admin_user";
    case roleType.MUNICIPALITY:
      return "municipality_user";
  }
};

export const userRepository = {
  async createUser(
    email: string,
    username: string,
    firstName: string,
    lastName: string,
    password: string,
    role: roleType = roleType.CITIZEN,
    override: object = {}, // check the prisma schema for the correct field name
  ): Promise<AnyUserDto> {
    const params = buildParamsObject(
      { email, username, firstName, lastName, password, role },
      override,
    );
    throwBadRequestIfMissingObject(params);

    const createdUser = await (prisma as any)[userTable(role)].create({
      data: {
        email,
        username,
        firstName,
        lastName,
        password,
        ...override,
      },
      select: selectExtras(role),
    });

    return mapPrismaUserToDto(createdUser, role)!;
  },

  async findUserByEmail(
    email: string,
    role: roleType = roleType.CITIZEN,
  ): Promise<AnyUserDto | null> {
    throwBadRequestIfMissingObject({ email });

    const row = await (prisma as any)[userTable(role)].findUnique({
      where: { email },
      select: selectExtras(role, true),
    });

    return mapPrismaUserToDto(row, role);
  },

  async findUserByUsername(
    username: string,
    role: roleType = roleType.CITIZEN,
  ): Promise<AnyUserDto | null> {
    throwBadRequestIfMissingObject({ username });

    const row = await (prisma as any)[userTable(role)].findUnique({
      where: { username },
      select: selectExtras(role, true),
    });

    return mapPrismaUserToDto(row, role);
  },

  async findUserById(
    id: number,
    role: roleType = roleType.CITIZEN,
  ): Promise<AnyUserDto | null> {
    throwBadRequestIfMissingObject({ id });

    const row = await (prisma as any)[userTable(role)].findUnique({
      where: { id },
      select: selectExtras(role),
    });

    return mapPrismaUserToDto(row, role);
  },

  async getAllUsers() {
    const users = await prisma.user.findMany({
      select: selectExtras(roleType.CITIZEN),
    });

    return users.map((user) => mapPrismaUserToDto(user, roleType.CITIZEN));
  },

  async deleteUser(userId: number, role: roleType = roleType.CITIZEN) {
    throwBadRequestIfMissingObject({ userId });

    const deletedUser = await (prisma as any)[userTable(role)].delete({
      where: { id: userId },
    });

    return mapPrismaUserToDto(deletedUser, role);
  },

  async getUsersByRole(role: roleType) {
    const users = await (prisma as any)[userTable(role)].findMany({
      select: selectExtras(role),
    });

    return users.map((user: any) => mapPrismaUserToDto(user, role));
  },

  async updateUserProfile(
    id: number,
    telegramUsername?: string,
    notifications?: boolean,
    profilePhotoPath?: string,
  ) {
    const params = buildParamsObject(
      { id },
      { telegramUsername, notifications, profilePhotoPath },
    );
    throwBadRequestIfMissingObject(params);

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

  async findLeastLoadedOfficerByOfficeName(officeName: string) {
    throwBadRequestIfMissingObject({ officeName });

    const officer = await prisma.municipality_user.findFirst({
      where: {
        municipality_role: {
          name: officeName,
        },
      },
      orderBy: {
        assignedReports: {
          _count: "asc",
        },
      },
    });

    return officer ? mapPrismaUserToDto(officer, roleType.MUNICIPALITY) : null;
  },
};
