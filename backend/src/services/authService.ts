import { userRepository } from "@repositories/userRepository";
import { roleType } from "@models/enums";
import jwt, { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";

import { SECRET_KEY } from "@config";
import { AuthenticationError } from "@errors/AuthenticationError";

export const authService = {
  async login(
    identifier: string,
    password: string,
    role: roleType = roleType.CITIZEN,
  ) {
    const user =
      (await userRepository.findUserByEmail(identifier, role)) ||
      (await userRepository.findUserByUsername(identifier, role));

    if (!user || !user.id || !user.password) {
      throw new AuthenticationError("Invalid username or password");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AuthenticationError("Invalid username or password");
    }

    // Re-fetch the user with relations (municipality_role) to return full user
    const fullUser = await userRepository.findUserById(user.id, role);

    if (!fullUser) {
      throw new Error("User not found after authentication");
    }

    const token = jwt.sign(
      { id: fullUser.id, email: fullUser.email, role },
      SECRET_KEY,
      { expiresIn: "1h" },
    );
    return { user: fullUser, token };
  },

  async verifyAuth(authToken: any) {
    if (!authToken) {
      throw new AuthenticationError("No token provided");
    }

    try {
      const decoded = jwt.verify(authToken, SECRET_KEY) as JwtPayload;
      const user = await userRepository.findUserById(decoded.id, decoded.role);

      return user;
    } catch (error) {
      throw new AuthenticationError("Invalid or expired token");
    }
  },
};
