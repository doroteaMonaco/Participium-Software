import { Router } from "express";
import { emailController } from "@controllers/emailController";

const router = Router();

// POST /api/email/send-verification - Send verification email
router.post("/send-verification", emailController.sendVerificationEmail);

export default router;
