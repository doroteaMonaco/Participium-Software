import { userRepository } from '../repositories/userRepository';
import bcrypt from 'bcrypt';

export const userService = {
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


    return  user ;
  },

}