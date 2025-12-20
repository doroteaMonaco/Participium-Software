export interface VerifyRegistrationRequest {
  emailOrUsername: string;
  code: string;
}

export interface ResendCodeRequest {
  emailOrUsername: string;
}

export interface RegistrationResponse {
  message: string;
  email: string;
}

export interface VerificationResponse {
  message: string;
}

export interface PendingUserDto {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  verificationCodeHash: string;
  verificationCodeExpiry: Date;
  verificationAttempts: number;
  createdAt: Date;
}
