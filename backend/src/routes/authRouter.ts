import { Router } from 'express';
import { authController } from '../controllers/authController';

const router = Router();

// Route for user registration
router.post('/register', authController.register);

export default router;