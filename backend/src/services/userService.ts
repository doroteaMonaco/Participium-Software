import { userRepository } from "@repositories/userRepository";
import bcrypt from "bcrypt";
import imageService from "./imageService";
import { roleType } from "@models/enums";
import { roleRepository } from "@repositories/roleRepository";

export const userService = {
  async registerUser(
    email: string,
    username: string,
    firstName: string,
    lastName: string,
    password: string,
  ) {
    // Check if email is already in use
    const existingEmail = await userRepository.findUserByEmail(email);
    if (existingEmail) {
      throw new Error("Email is already in use");
    }

    // Check if username is already in use
    const existingUsername = await userRepository.findUserByUsername(username);
    if (existingUsername) {
      throw new Error("Username is already in use");
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const user = await userRepository.createUser(
      email,
      username,
      firstName,
      lastName,
      hashedPassword,
    );

    return user;
  },

  async createMunicipalityUser(
    email: string,
    username: string,
    firstName: string,
    lastName: string,
    password: string,
    municipality_role_id: number,
  ) {
    const existingEmail = await userRepository.findUserByEmail(email);
    if (existingEmail) {
      throw new Error("Email is already in use");
    }

    const existingUsername = await userRepository.findUserByUsername(username);
    if (existingUsername) {
      throw new Error("Username is already in use");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userRepository.createUserWithRole(
      email,
      username,
      firstName,
      lastName,
      hashedPassword,
      "MUNICIPALITY",
      municipality_role_id,
    );

    return user;
  },

  async getAllUsers() {
    return await userRepository.getAllUsers();
  },

  async getUserById(userId: number) {
    return await userRepository.findUserById(userId);
  },

  async deleteUser(userId: number) {
    const user = await userRepository.findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    return await userRepository.deleteUser(userId);
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
      throw new Error("User not found");
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
