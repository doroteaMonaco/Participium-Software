import { prisma } from "@database";

export const emailRepository = {
  async logEmailSent(email: string, type: string, userId?: number) {
    try {
      return {
        email,
        type,
        userId,
        sentAt: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to log email: ${error}`);
    }
  },

  async getEmailsByUser(userId: number) {
    try {
      return {
        userId,
        emails: [],
      };
    } catch (error) {
      throw new Error(`Failed to retrieve emails for user: ${error}`);
    }
  },
};
