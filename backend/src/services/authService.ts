import { userRepository } from "@repositories/userRepository";
import { roleType } from "@models/enums";
import jwt, { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";

import { SECRET_KEY } from "@config";
import { AuthenticationError } from "@errors/AuthenticationError";

// All roles to search through when role is not specified
const allRoles = [
  roleType.CITIZEN,
  roleType.MUNICIPALITY,
  roleType.ADMIN,
  roleType.EXTERNAL_MAINTAINER,
];

export const authService = {
  async login(
    identifier: string,
    password: string,
    role?: roleType,
  ) {
    let user = null;
    let foundRole: roleType | null = null;

    if (role) {
      // If role is specified, search only in that table
      user =
        (await userRepository.findUserByEmail(identifier, role)) ||
        (await userRepository.findUserByUsername(identifier, role));
      foundRole = role;
    } else {
      // If role is not specified, search in all tables
      for (const r of allRoles) {
        user =
          (await userRepository.findUserByEmail(identifier, r)) ||
          (await userRepository.findUserByUsername(identifier, r));
        if (user) {
          foundRole = r;
          break;
        }
      }
    }

    if (!user || !user.id || !user.password || !foundRole) {
      throw new AuthenticationError("Invalid username or password");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AuthenticationError("Invalid username or password");
    }

    // Re-fetch the user with relations (municipality_role) to return full user
    const fullUser = await userRepository.findUserById(user.id, foundRole);

    if (!fullUser) {
      throw new Error("User not found after authentication");
    }

    const token = jwt.sign(
      { id: fullUser.id, email: fullUser.email, role: foundRole },
      SECRET_KEY,
      { expiresIn: "1h" },
    );
    
    // Add role to user object for frontend routing
    return { user: { ...fullUser, role: foundRole }, token };
  },

  async verifyAuth(authToken: any) {
    if (!authToken) {
      throw new AuthenticationError("No token provided");
    }

    try {
      const decoded = jwt.verify(authToken, SECRET_KEY) as JwtPayload;
      const user = await userRepository.findUserById(decoded.id, decoded.role);

      // Add role to user object for frontend routing
      return user ? { ...user, role: decoded.role } : null;
    } catch (error) {
      throw new AuthenticationError("Invalid or expired token");
    }
  },
};
