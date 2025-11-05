import { Request, Response } from 'express';
import { authService } from '../services/authService';

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const { email, username, firstName, lastName, password } = req.body;

      // Call the service to register the user
      const user = await authService.registerUser(email, username, firstName, lastName, password);

      res.status(201).json(user);
    } catch (error: any) {
      if (error.message === 'Email is already in use' || error.message === 'Username is already in use') {
        res.status(409).json({ error: 'Conflict Error', message: error.message });
      } else {
        res.status(400).json({ error: 'Bad Request', message: error.message });
      }
    }
  },
};