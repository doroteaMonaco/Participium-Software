/*
import { Router } from "express";
import {
  sendMessage,
  getReceivedMessages,
  getMessageById,
  markMessageAsRead,
} from "@controllers/messageController";
import { isAuthenticated } from "@middlewares/authMiddleware";
import { isMunicipality } from "@middlewares/roleMiddleware";

const router = Router();

// All routes require authentication
router.use(isAuthenticated);

// Send message - only municipality users can send
router.post("/", isMunicipality, sendMessage);

// Get received messages - citizens can view their messages
router.get("/", getReceivedMessages);

// Get specific message by ID
router.get("/:id", getMessageById);

// Mark message as read
router.put("/:id/read", markMessageAsRead);

export default router;
*/
