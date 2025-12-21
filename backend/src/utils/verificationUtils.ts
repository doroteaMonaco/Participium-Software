import crypto from "crypto";
import { CONFIG } from "@config/config";

export const generateVerificationCode = (): string => {
  const code = Math.floor(
    Math.random() * Math.pow(10, CONFIG.VERIFICATION_CODE_LENGTH),
  )
    .toString()
    .padStart(CONFIG.VERIFICATION_CODE_LENGTH, "0");
  return code;
};

export const hashVerificationCode = (code: string): string => {
  return crypto.createHash("sha256").update(code).digest("hex");
};

export const verifyCode = (plainCode: string, hashedCode: string): boolean => {
  const hash = hashVerificationCode(plainCode);
  return hash === hashedCode;
};

export const getVerificationCodeExpiry = (): Date => {
  const expiryTime = new Date();
  expiryTime.setMinutes(
    expiryTime.getMinutes() + CONFIG.VERIFICATION_CODE_EXPIRY_MINUTES,
  );
  return expiryTime;
};

export const isCodeExpired = (expiryTime: Date): boolean => {
  return new Date() > expiryTime;
};

export default {
  generateVerificationCode,
  hashVerificationCode,
  verifyCode,
  getVerificationCodeExpiry,
  isCodeExpired,
};
