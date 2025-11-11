import { Router } from 'express';
import { submitReport } from '../controllers/reportController';
import { isAuthenticated } from '../middlewares/authMiddleware';
import { isCitizen } from '../middlewares/roleMiddleware';

const router = Router();

// POST /api/reports - Create a new report (authenticated users only)
router.post('/', isAuthenticated, isCitizen, submitReport);

export default router;