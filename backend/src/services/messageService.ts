import messageRepository, {
  CreateMessageDto,
  MessageResponseDto,
} from "@repositories/messageRepository";

const sendMessage = async (
  data: CreateMessageDto,
): Promise<MessageResponseDto> => {
  if (!data.title || data.title.trim().length === 0) {
    throw new Error("Title is required");
  }

  if (!data.content || data.content.trim().length === 0) {
    throw new Error("Content is required");
  }

  if (!data.sender_id || !data.recipient_id) {
    throw new Error("Sender and recipient are required");
  }

  if (data.sender_id === data.recipient_id) {
    throw new Error("Cannot send message to yourself");
  }

  return await messageRepository.create(data);
};

const getReceivedMessages = async (
  userId: number,
): Promise<MessageResponseDto[]> => {
  return await messageRepository.findByRecipientId(userId);
};

const getMessageById = async (id: number): Promise<MessageResponseDto> => {
  const message = await messageRepository.findById(id);
  if (!message) {
    throw new Error("Message not found");
  }
  return message;
};

const markMessageAsRead = async (id: number): Promise<MessageResponseDto> => {
  const message = await messageRepository.findById(id);

  if (!message) {
    throw new Error("Message not found");
  }

  return await messageRepository.markAsRead(id);
};

export default {
  sendMessage,
  getReceivedMessages,
  getMessageById,
  markMessageAsRead,
};
