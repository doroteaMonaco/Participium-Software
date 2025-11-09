import { Router } from 'express';
import { userController } from '../controllers/userController';

const router = Router();

router.get('/municipality-roles', userController.getAllMunicipalityRoles);

export default router;