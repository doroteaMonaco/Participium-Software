import { Request, Response } from "express";
import { sendVerificationEmail } from "@services/emailService";
import { throwBadRequestIfMissingObject } from "@utils";

export const emailController = {
  async sendVerificationEmail(req: Request, res: Response) {
    try {
      const { email, firstName, code, resendUrl } = req.body || {};

      throwBadRequestIfMissingObject({
        email,
        firstName,
        code,
      });

      const result = await sendVerificationEmail({
        email,
        firstName,
        code,
        resendUrl,
      });

      return res.status(200).json({
        success: true,
        message: "Verification email sent successfully",
        data: result,
      });
    } catch (error: any) {
      return res.status(500).json({
        error: "Email Service Error",
        message: error?.message || "Failed to send verification email",
      });
    }
  },
};
