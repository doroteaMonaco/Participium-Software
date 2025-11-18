import { Router } from "express";
import { authController } from "@controllers/authController";

const router = Router();

// POST /api/auth/session - Login
router.post("/session", authController.login);

// GET /api/auth/session - Verify authentication
router.get("/session", authController.verifyAuth);

// DELETE /api/auth/session - Logout
router.delete("/session", authController.logout);

export default router;
