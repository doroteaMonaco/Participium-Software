import { userRepository } from "@repositories/userRepository";
import bcrypt from "bcrypt";
import imageService from "./imageService";
import { Category, roleType } from "@models/enums";
import { roleRepository } from "@repositories/roleRepository";
import {
  AnyUserDto,
  buildUserDto,
  CreateBaseUserDto,
  ExternalMaintainerUserDto,
  MunicipalityUserDto,
} from "@dto/userDto";
import { NotFoundError } from "@models/errors/NotFoundError";

export const userService = {
  async registerUser(
    newUser: CreateBaseUserDto,
    role: roleType = roleType.CITIZEN,
    override: object = {},
  ): Promise<AnyUserDto> {
    // Check if email is already in use
    const existingEmail = await userRepository.findUserByEmail(
      newUser.email,
      role,
    );
    if (existingEmail) {
      throw new NotFoundError("Email is already in use");
    }

    // Check if username is already in use
    const existingUsername = await userRepository.findUserByUsername(
      newUser.username,
      role,
    );
    if (existingUsername) {
      throw new NotFoundError("Username is already in use");
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(newUser.password, 10);

    // Extract firstName and lastName from newUser if not in override
    const mergedOverride = {
      ...((newUser as any).firstName && { firstName: (newUser as any).firstName }),
      ...((newUser as any).lastName && { lastName: (newUser as any).lastName }),
      ...((newUser as any).companyName && { companyName: (newUser as any).companyName }),
      ...((newUser as any).category && { category: (newUser as any).category }),
      ...override,
    };

    // Create the user
    const user = await userRepository.createUser(
      newUser.email,
      newUser.username, 
      hashedPassword,
      role,
      mergedOverride,
    );

    return buildUserDto(user)!;
  },

  async createMunicipalityUser(
    municipalityUser: CreateBaseUserDto,
    firstName: string,
    lastName: string,
    municipality_role_id?: number,
  ): Promise<MunicipalityUserDto> {
    return this.registerUser(municipalityUser, roleType.MUNICIPALITY, {
      firstName: firstName,
      lastName: lastName,
      municipality_role_id: municipality_role_id,
    }) as unknown as MunicipalityUserDto;
  },

  async createExternalMaintainerUser(
    externalMaintainerUser: CreateBaseUserDto,
    companyName?: string,
    category?: Category,
  ): Promise<ExternalMaintainerUserDto> {
    return this.registerUser(externalMaintainerUser, roleType.EXTERNAL_MAINTAINER, {
      companyName: companyName,
      category: category,
    }) as unknown as ExternalMaintainerUserDto;
  },

  async getAllUsers() {
    return await userRepository.getAllUsers();
  },

  async getUserById(userId: number, role: roleType = roleType.CITIZEN) {
    return await userRepository.findUserById(userId, role);
  },

  async deleteUser(userId: number, role: roleType = roleType.CITIZEN) {
    const user = await userRepository.findUserById(userId, role);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return await userRepository.deleteUser(userId, role);
  },

  async getAllMunicipalityRoles() {
    return await roleRepository.getAllMunicipalityRoles();
  },

  async getMunicipalityUsers() {
    return await userRepository.getUsersByRole(roleType.MUNICIPALITY);
  },

   async getExternalMaintainerUsers() {
    return await userRepository.getUsersByRole(roleType.EXTERNAL_MAINTAINER);
  },

  async updateCitizenProfile(
    id: number,
    photoKey?: string | undefined,
    telegramUsername?: string | undefined,
    notificationsEnabled?: boolean | undefined,
  ) {
    const user = await userRepository.findUserById(id);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    let photoPath;
    if (photoKey) {
      photoPath = await imageService.persistUserImage(photoKey, id);
    }

    const updatedUser = await userRepository.updateUserProfile(
      id,
      telegramUsername,
      notificationsEnabled,
      photoPath,
    );

    return updatedUser;
  },
};
