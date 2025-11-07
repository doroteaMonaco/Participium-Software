import { Router } from 'express';
import { authController } from '../controllers/authController';

const router = Router();

// POST /api/users - User registration
router.post('/users', authController.register);

// POST /api/auth/session - Login
router.post('/auth/session', authController.login);

// GET /api/auth/session - Verify authentication
router.get('/auth/session', authController.verifyAuth);

// DELETE /api/auth/session - Logout
router.delete('/auth/session', authController.logout);

export default router;