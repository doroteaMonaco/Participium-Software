import bcrypt from "bcrypt";
import logger from "@config/logger";
import { CONFIG } from "@config";
import { emailRepository } from "@repositories/emailRepository";
import { BadRequestError } from "@errors/BadRequestError";
import { NotFoundError } from "@errors/NotFoundError";
import { TooManyRequestsError } from "@errors/TooManyRequestsError";

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

  async verifyCodeHash(
    plainCode: string,
    hashedCode: string,
  ): Promise<boolean> {
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

    await emailRepository.deleteByEmail(email);

    await emailRepository.createVerification(
      email,
      username,
      firstName,
      lastName,
      hashedPassword,
      codeHash,
      expiryDate,
    );

    logger.info(`Created pending verification for ${email}`);

    return {
      code,
      expiresIn: expiryMinutes * 60,
    };
  },

  async getPendingVerification(emailOrUsername: string) {
    return emailRepository.getVerification(emailOrUsername);
  },

  async verifyCode(emailOrUsername: string, plainCode: string): Promise<void> {
    const pending = await this.getPendingVerification(emailOrUsername);

    if (!pending) {
      logger.warn(`No pending verification found for ${emailOrUsername}`);
      throw new NotFoundError("No pending verification found");
    }

    if (new Date() > pending.verificationCodeExpiry) {
      logger.warn(`Verification code expired for ${emailOrUsername}`);
      await emailRepository.deleteById(pending.id);
      throw new BadRequestError("Verification code has expired");
    }

    if (pending.verificationAttempts >= CONFIG.MAX_VERIFICATION_ATTEMPTS) {
      logger.warn(`Too many verification attempts for ${emailOrUsername}`);
      await emailRepository.deleteById(pending.id);
      throw new TooManyRequestsError("Too many verification attempts");
    }

    const isValid = await this.verifyCodeHash(
      plainCode,
      pending.verificationCodeHash,
    );

    if (!isValid) {
      await emailRepository.updateVerificationAttempts(
        pending.id,
        pending.verificationAttempts + 1,
      );
      logger.warn(`Invalid code attempt for ${emailOrUsername}`);
      throw new BadRequestError("Invalid verification code");
    }

    logger.info(`Code verified for ${emailOrUsername}`);
  },

  async completePendingVerification(emailOrUsername: string) {
    const pending = await this.getPendingVerification(emailOrUsername);

    if (!pending) {
      return null;
    }

    await emailRepository.deleteById(pending.id);
    return pending;
  },

  async resendCode(
    emailOrUsername: string,
  ): Promise<{ email: string; firstName: string; code: string }> {
    const pending = await this.getPendingVerification(emailOrUsername);

    if (!pending) {
      logger.warn(
        `No pending verification found for resend: ${emailOrUsername}`,
      );
      throw new NotFoundError("No pending verification found");
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (pending.createdAt > oneHourAgo) {
      logger.warn(`Rate limit exceeded for ${emailOrUsername}`);
      throw new TooManyRequestsError("Too many verification attempts");
    }

    const { code, expiresIn } = await this.createPendingVerification(
      pending.email,
      pending.username,
      pending.firstName,
      pending.lastName,
      pending.password,
    );

    return { email: pending.email, firstName: pending.firstName, code };
  },
};
