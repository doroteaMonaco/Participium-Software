import { userRepository } from "@repositories/userRepository";
import bcrypt from "bcrypt";
import imageService from "./imageService";
import { roleType } from "@models/enums";
import { roleRepository } from "@repositories/roleRepository";
import {
  AnyUserDto,
  buildUserDto,
  CreateBaseUserDto,
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

    // Create the user
    const user = await userRepository.createUser(
      newUser.email,
      newUser.username,
      newUser.firstName,
      newUser.lastName,
      hashedPassword,
      role,
      override,
    );

    return buildUserDto(user)!;
  },

  async createMunicipalityUser(
    municipalityUser: CreateBaseUserDto,
    municipality_role_id?: number,
  ): Promise<MunicipalityUserDto> {
    return this.registerUser(municipalityUser, roleType.MUNICIPALITY, {
      municipality_role_id: municipality_role_id,
    });
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
