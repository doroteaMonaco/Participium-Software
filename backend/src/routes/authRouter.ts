import { Router } from "express";
import { authController } from "@controllers/authController";

const router = Router();

// POST /api/auth/session - Login
router.post("/session", authController.login);

// GET /api/auth/session - Verify authentication
router.get("/session", authController.verifyAuth);

// DELETE /api/auth/session - Logout
router.delete("/session", authController.logout);

// POST /api/auth/verify - Verify email and complete registration
router.post("/verify", authController.verifyEmailAndRegister);

// POST /api/auth/resend-code - Resend verification code
router.post("/resend-code", authController.resendVerificationCode);

export default router;
