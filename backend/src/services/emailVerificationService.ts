import { prisma } from "@database";
import bcrypt from "bcrypt";
import logger from "@config/logger";
import { CONFIG } from "@config";

export const emailVerificationService = {
  async generateVerificationCode(): Promise<string> {
    let code = "";
    for (let i = 0; i < CONFIG.VERIFICATION_CODE_LENGTH; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    return code;
  },

  async hashCode(code: string): Promise<string> {
    return bcrypt.hash(code, 10);
  },

  async verifyCodeHash(plainCode: string, hashedCode: string): Promise<boolean> {
    return bcrypt.compare(plainCode, hashedCode);
  },

  async createPendingVerification(
    email: string,
    username: string,
    firstName: string,
    lastName: string,
    hashedPassword: string,
  ): Promise<{ code: string; expiresIn: number }> {
    const code = await this.generateVerificationCode();
    const codeHash = await this.hashCode(code);

    const expiryMinutes = CONFIG.VERIFICATION_CODE_EXPIRY_MINUTES;
    const expiryDate = new Date(Date.now() + expiryMinutes * 60 * 1000);

    await prisma.pending_verification_user.deleteMany({
      where: { email },
    });

    await prisma.pending_verification_user.create({
      data: {
        email,
        username,
        firstName,
        lastName,
        password: hashedPassword,
        verificationCodeHash: codeHash,
        verificationCodeExpiry: expiryDate,
        verificationAttempts: 0,
      },
    });

    logger.info(`Created pending verification for ${email}`);

    return {
      code,
      expiresIn: expiryMinutes * 60,
    };
  },

  async getPendingVerification(emailOrUsername: string) {
    return prisma.pending_verification_user.findFirst({
      where: {
        OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
      },
    });
  },

  async verifyCode(emailOrUsername: string, plainCode: string): Promise<boolean> {
    const pending = await this.getPendingVerification(emailOrUsername);

    if (!pending) {
      logger.warn(`No pending verification found for ${emailOrUsername}`);
      return false;
    }

    if (new Date() > pending.verificationCodeExpiry) {
      logger.warn(`Verification code expired for ${emailOrUsername}`);
      await prisma.pending_verification_user.delete({ where: { id: pending.id } });
      return false;
    }

    if (pending.verificationAttempts >= CONFIG.MAX_VERIFICATION_ATTEMPTS) {
      logger.warn(`Too many verification attempts for ${emailOrUsername}`);
      await prisma.pending_verification_user.delete({ where: { id: pending.id } });
      return false;
    }

    const isValid = await this.verifyCodeHash(plainCode, pending.verificationCodeHash);

    if (!isValid) {
      await prisma.pending_verification_user.update({
        where: { id: pending.id },
        data: { verificationAttempts: pending.verificationAttempts + 1 },
      });
      logger.warn(`Invalid code attempt for ${emailOrUsername}`);
      return false;
    }

    logger.info(`Code verified for ${emailOrUsername}`);
    return true;
  },

  async completePendingVerification(emailOrUsername: string) {
    const pending = await this.getPendingVerification(emailOrUsername);

    if (!pending) {
      return null;
    }

    await prisma.pending_verification_user.delete({
      where: { id: pending.id },
    });

    return pending;
  },

  async resendCode(emailOrUsername: string): Promise<{ code: string; expiresIn: number } | null> {
    const pending = await this.getPendingVerification(emailOrUsername);

    if (!pending) {
      logger.warn(`No pending verification found for resend: ${emailOrUsername}`);
      return null;
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (pending.createdAt > oneHourAgo) {
      logger.warn(`Rate limit exceeded for ${emailOrUsername}`);
      return null;
    }

    return this.createPendingVerification(
      pending.email,
      pending.username,
      pending.firstName,
      pending.lastName,
      pending.password,
    );
  },
};
