import { Router } from 'express';
import { userController } from '../controllers/userController';

const router = Router();

// POST /api/users - User registration
router.post('/', userController.register);

router.get('/municipality-roles', userController.getAllMunicipalityRoles);

export default router;