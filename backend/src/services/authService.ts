import { userRepository } from '../repositories/userRepository';
import { roleRepository } from '../repositories/roleRepository';
import { roleType } from "../models/enums"
import jwt, { JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const SECRET_KEY = process.env.JWT_SECRET || 'default_secret_key';

export const authService = {
  async registerUser(email: string, username: string, firstName: string, lastName: string, password: string) {
    // Check if email is already in use
    const existingEmail = await userRepository.findUserByEmail(email);
    if (existingEmail) {
      throw new Error('Email is already in use');
    }

    // Check if username is already in use
    const existingUsername = await userRepository.findUserByUsername(username);
    if (existingUsername) {
      throw new Error('Username is already in use');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const user = await userRepository.createUser(email, username, firstName, lastName, hashedPassword);

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: '1h' });

    return { user, token };
  },

  async login(identifier: string, password: string) {
    const user = await userRepository.findUserByEmail(identifier) || await userRepository.findUserByUsername(identifier);
    if (!user) {
      throw new Error('Invalid username or email');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
    return { user, token };
  },

  async verifyAuth(req: any) {
    const token = req.cookies?.authToken;
    if (!token) {
      throw new Error('No token provided');
    }

    try {
      const decoded = jwt.verify(token, SECRET_KEY) as JwtPayload;
      const user = await userRepository.findUserById(decoded.id);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  },

  async createMunicipalityUser(
    email: string,
    username: string,
    firstName: string,
    lastName: string,
    password: string,
    municipality_role_id: number
  ) {
    const existingEmail = await userRepository.findUserByEmail(email);
    if (existingEmail) {
      throw new Error('Email is already in use');
    }

    const existingUsername = await userRepository.findUserByUsername(username);
    if (existingUsername) {
      throw new Error('Username is already in use');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userRepository.createUserWithRole(email, username, firstName, lastName, hashedPassword, 'MUNICIPALITY', municipality_role_id);

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
      throw new Error('User not found');
    }
    return await userRepository.deleteUser(userId);
  },

  async getAllMunicipalityRoles() {
    return await roleRepository.getAllMunicipalityRoles();
  },

  async getMunicipalityUsers() {
    return await userRepository.getUsersByRole(roleType.MUNICIPALITY);
  }

};