import { Request, Response } from 'express';
import { authService } from '../services/authService';

// NEW: opzioni centralizzate per il cookie (riusate in login/register/logout)
const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production', // nei test/dev false
  path: '/',
};

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const { email, username, firstName, lastName, password } = req.body || {};

      // NEW: validazione esplicita del body -> 400 coerente con Swagger e test
      if (!email || !username || !firstName || !lastName || !password) {
        return res.status(400).json({ error: 'Bad Request', message: 'Missing required fields' });
      }

      // CHANGED: registriamo l’utente...
      const { user } = await authService.registerUser(email, username, firstName, lastName, password);
      /**
       * ...e subito dopo effettuiamo login per ottenere il token e settare il cookie
       * (allinea il comportamento a Swagger: Set-Cookie + Location /reports)
       */
      const { token } = await authService.login(email, password);

      // NEW: usiamo res.cookie (non setHeader) per l’authToken
      res.cookie('authToken', token, cookieOpts);
      // NEW: Location coerente con Swagger
      res.setHeader('Location', '/reports');

      // CHANGED: risposta sintetizzata (niente email/password/id) + token incluso --> si può cambiare
      return res.status(201).json({
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        token
      });
    } catch (error: any) {
      // CHANGED: mapping 409 per conflitti noti, 400 per il resto (coerente con Swagger)
      if (error?.message === 'Email is already in use' || error?.message === 'Username is already in use') {
        return res.status(409).json({ error: 'Conflict Error', message: error.message });
      }
      return res.status(400).json({ error: 'Bad Request', message: error?.message || 'Registration failed' });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { identifier, password } = req.body || {};
      // NEW: 400 se mancano i campi richiesti (prima era meno esplicito)
      if (!identifier || !password) {
        return res.status(400).json({ error: 'Bad Request', message: 'identifier and password are required' });
      }

      const { user, token } = await authService.login(identifier, password);

      // NEW: set cookie httpOnly + Location /reports (come da Swagger)
      res.cookie('authToken', token, cookieOpts);
      res.setHeader('Location', '/reports');

      // CHANGED: payload sintetizzato (no email/password/id) --> si può cambiare
      return res.status(200).json({
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      });
    } catch (error: any) {
      // CHANGED: 401 con messaggio standardizzato
      return res.status(401).json({ error: 'Authentication Error', message: error?.message || 'Invalid username or password' });
    }
  },

  async verifyAuth(req: Request, res: Response) {
    try {
      // NEW: si appoggia al token nel cookie (cookie-parser necessario in app.ts)
      const user = await authService.verifyAuth(req);
      // CHANGED: risposta sintetizzata --> si può cambiare
      return res.status(200).json({
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      });
    } catch {
      // CHANGED: messaggio d’errore consistente con test/Swagger
      return res.status(401).json({ error: 'Authentication Error', message: 'Session is invalid or has expired' });
    }
  },

  async logout(req: Request, res: Response) {
    // NEW: 401 se non c’è cookie -> impedisce logout “a vuoto”
    const hasCookie = Boolean(req.cookies?.authToken);
    if (!hasCookie) {
      return res.status(401).json({ error: 'Authentication Error', message: 'You must be logged in to logout' });
    }
    // NEW: uso di clearCookie con le stesse opzioni con cui è stato impostato
    res.clearCookie('authToken', cookieOpts);
    return res.status(204).send();
  },
};
