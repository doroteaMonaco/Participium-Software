import { Request, Response } from 'express';
import { authService } from '../services/authService';

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const { email, username, firstName, lastName } = req.body;

      // Call the service to register the user
      const user = await authService.registerUser(email, username, firstName, lastName);

      res.status(201).json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  },
};