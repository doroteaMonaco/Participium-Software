import { authRepository } from '../repositories/authRepository';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'default_secret_key';

export const authService = {
  async registerUser(email: string, username: string, firstName: string, lastName: string) {
    // Check if email is already in use
    const existingEmail = await authRepository.findUserByEmail(email);
    if (existingEmail) {
      throw new Error('Email is already in use');
    }

    // Check if username is already in use
    const existingUsername = await authRepository.findUserByUsername(username);
    if (existingUsername) {
      throw new Error('Username is already in use');
    }

    // Create the user
    const user = await authRepository.createUser(email, username, firstName, lastName);

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });

    return { user, token };
  },
};