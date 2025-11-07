import { Router } from 'express';
import { submitReport } from '../controllers/reportController';

const router = Router();

// POST /api/reports - Create a new report (authenticated users only)
router.post('/reports', submitReport);

export default router;