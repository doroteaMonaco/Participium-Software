import { prisma } from "@database";

export const emailRepository = {
  async createVerification(
    email: string,
    username: string,
    firstName: string,
    lastName: string,
    password: string,
    verificationCodeHash: string,
    verificationCodeExpiry: Date,
  ) {
    try {
      await prisma.pending_verification_user.create({
        data: {
          email,
          username,
          firstName,
          lastName,
          password,
          verificationCodeHash,
          verificationCodeExpiry,
        },
      });
    } catch (error) {
      throw new Error(`Failed to create verification: ${error}`);
    }
  },

  async getVerification(emailOrUsername: string) {
    try {
      return await prisma.pending_verification_user.findFirst({
        where: {
          OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
        },
      });
    } catch (error) {
      throw new Error(`Failed to get pending verification: ${error}`);
    }
  },

  async updateVerificationAttempts(id: number, attempts: number) {
    try {
      await prisma.pending_verification_user.update({
        where: { id },
        data: { verificationAttempts: attempts },
      });
    } catch (error) {
      throw new Error(
        `Failed to update pending verification attempts: ${error}`,
      );
    }
  },

  async deleteByEmail(email: string) {
    try {
      await prisma.pending_verification_user.deleteMany({
        where: { email },
      });
    } catch (error) {
      throw new Error(
        `Failed to delete pending verification by email: ${error}`,
      );
    }
  },

  async deleteById(id: number) {
    try {
      await prisma.pending_verification_user.delete({
        where: { id },
      });
    } catch (error) {
      throw new Error(`Failed to delete pending verification by id: ${error}`);
    }
  },
};
