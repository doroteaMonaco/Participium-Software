import { Request, Response } from "express";
import messageService from "@services/messageService";

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { title, content, recipient_id } = req.body;
    const sender_id = req.user!.id;

    const message = await messageService.sendMessage({
      title,
      content,
      sender_id,
      recipient_id: Number(recipient_id),
    });

    res.status(201).json(message);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send message";
    const statusCode =
      error instanceof Error && error.message === "Message not found"
        ? 404
        : 400;
    res.status(statusCode).json({ error: errorMessage });
  }
};

export const getReceivedMessages = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const messages = await messageService.getReceivedMessages(userId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

export const getMessageById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const message = await messageService.getMessageById(Number(id));

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user is the recipient
    if (message.sender.id !== req.user!.id) {
      // For now, allow access. In production, check if user is recipient
    }

    res.json(message);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch message" });
  }
};

export const markMessageAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const message = await messageService.markMessageAsRead(Number(id));

    // Check if user is the recipient
    // For now, allow any authenticated user to mark as read

    res.json(message);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to mark message as read";
    const statusCode =
      error instanceof Error && error.message === "Message not found"
        ? 404
        : 500;
    res.status(statusCode).json({ error: errorMessage });
  }
};
