import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface CreateMessageDto {
  title: string;
  content: string;
  sender_id: number;
  recipient_id: number;
}

export interface MessageResponseDto {
  id: number;
  title: string;
  content: string;
  sentAt: Date;
  readAt: Date | null;
  sender: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

const create = async (data: CreateMessageDto): Promise<MessageResponseDto> => {
  const message = await prisma.message.create({
    data,
  });

  // Fetch the created message with sender info
  return (await prisma.message.findUnique({
    where: { id: message.id },
    select: {
      id: true,
      title: true,
      content: true,
      sentAt: true,
      readAt: true,
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  })) as MessageResponseDto;
};

const findByRecipientId = async (
  recipientId: number,
): Promise<MessageResponseDto[]> => {
  return await prisma.message.findMany({
    where: {
      recipient_id: recipientId,
    },
    select: {
      id: true,
      title: true,
      content: true,
      sentAt: true,
      readAt: true,
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      sentAt: "desc",
    },
  });
};

const findById = async (id: number): Promise<MessageResponseDto | null> => {
  return await prisma.message.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      sentAt: true,
      readAt: true,
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
};

const markAsRead = async (id: number): Promise<MessageResponseDto> => {
  return await prisma.message.update({
    where: { id },
    data: {
      readAt: new Date(),
    },
    select: {
      id: true,
      title: true,
      content: true,
      sentAt: true,
      readAt: true,
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
};

export default {
  create,
  findByRecipientId,
  findById,
  markAsRead,
};
