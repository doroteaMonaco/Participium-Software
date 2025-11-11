import { Router } from 'express';
import { submitReport } from '../controllers/reportController';
import { isAuthenticated } from '../middlewares/authMiddleware';
import { isCitizen } from '../middlewares/roleMiddleware';
import multer from 'multer';

const router = Router();

// Configure multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 3 // Maximum 3 files
  },
  fileFilter: (_req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});


// POST /api/reports - Create a new report (authenticated users only)
router.post(
  '/', 
  isAuthenticated, 
  isCitizen, 
  upload.array('photos', 3),
  submitReport
);

export default router;