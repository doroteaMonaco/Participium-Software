import { Resend } from "resend";
import { CONFIG } from "@config/config";
import logger from "@config/logger";

const resend = new Resend(CONFIG.RESEND_API_KEY);

export interface SendVerificationEmailParams {
  email: string;
  firstName: string;
  code: string;
  resendUrl?: string;
}

export const sendVerificationEmail = async (
  params: SendVerificationEmailParams,
) => {
  const { email, firstName, code, resendUrl } = params;

  try {
    const result = await resend.emails.send({
      from: CONFIG.RESEND_FROM_EMAIL,
      to: email,
      subject: "Verify your Participium account",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background-color: #ecf0f1; padding: 30px; border-radius: 0 0 5px 5px; }
              .code { background-color: #3498db; color: white; padding: 20px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 2px; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
              .button { background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Participium</h1>
              </div>
              <div class="content">
                <p>Hi ${firstName},</p>
                <p>Thank you for registering with Participium! To complete your registration, please verify your email address using the code below:</p>
                
                <div class="code">${code}</div>
                
                <p>This code will expire in ${CONFIG.VERIFICATION_CODE_EXPIRY_MINUTES} minutes.</p>
                
                ${
                  resendUrl
                    ? `<p><a href="${resendUrl}" class="button">Verify Email</a></p>`
                    : ""
                }
                
                <p>If you didn't create this account, please ignore this email.</p>
                
                <div class="footer">
                  <p>&copy; 2025 Participium. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (result.error) {
      logger.error("Failed to send verification email:", result.error);
      throw new Error(`Failed to send verification email: ${result.error}`);
    }

    logger.info(`Verification email sent to ${email}`);
    return result;
  } catch (error) {
    logger.error("Error sending verification email:", error);
    throw error;
  }
};

export default {
  sendVerificationEmail,
};
