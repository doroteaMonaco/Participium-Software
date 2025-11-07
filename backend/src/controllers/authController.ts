import { Request, Response } from 'express';
import { authService } from '../services/authService';

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const { email, username, firstName, lastName, password } = req.body;

      // Call the service to register the user
      const {user, token} = await authService.registerUser(email, username, firstName, lastName, password);
      
      res.setHeader('Set-Cookie', `authToken=${token}`);
      // Set Location header
      res.setHeader('Location', '/reports');
      res.status(201).send();
    } catch (error: any) {
      if (error.message === 'Email is already in use' || error.message === 'Username is already in use') {
        res.status(409).json({ error: 'Conflict Error', message: error.message });
      } else {
        res.status(400).json({ error: 'Bad Request', message: error.message });
      }
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { identifier, password } = req.body;
      const { user, token } = await authService.login(identifier, password);

      res.setHeader('Set-Cookie', `authToken=${token}`);
      res.setHeader('Location', '/reports');
      res.status(200).send();
    } catch (error: any) {
      res.status(401).json({ error: 'Authentication Error', message: error.message });
    }
  },

  async verifyAuth(req: Request, res: Response) {
    try {
      const user = await authService.verifyAuth(req);
      res.status(200).json(user);
    } catch (error: any) {
      res.status(401).json({ error: 'Authentication Error', message: error.message });
    }
  },

  async logout(req: Request, res: Response) {
    try {
      res.setHeader('Set-Cookie', 'authToken=; HttpOnly; Max-Age=0');
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  },
};