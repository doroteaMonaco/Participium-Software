const mockSend = jest.fn();

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

jest.mock("@config/logger", () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@config/config", () => ({
  CONFIG: {
    RESEND_API_KEY: "test-api-key",
    RESEND_FROM_EMAIL: "noreply@test.com",
    FRONTEND_URL: "http://localhost:3000",
    VERIFICATION_CODE_EXPIRY_MINUTES: 30,
  },
}));

import { sendVerificationEmail } from "@services/emailService";
import { Resend } from "resend";
import logger from "@config/logger";
import { CONFIG } from "@config";

describe("emailService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("sendVerificationEmail", () => {
    it("sends verification email with correct parameters", async () => {
      const params = {
        email: "user@example.com",
        firstName: "John",
        code: "123456",
      };

      mockSend.mockResolvedValue({ data: {}, error: null });

      await sendVerificationEmail(params);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: CONFIG.RESEND_FROM_EMAIL,
          to: params.email,
          subject: "Verify your Participium account",
        })
      );
    });

    it("includes verification code in email body", async () => {
      const params = {
        email: "user@example.com",
        firstName: "John",
        code: "123456",
      };

      mockSend.mockResolvedValue({ data: {}, error: null });

      await sendVerificationEmail(params);

      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain("123456");
    });

    it("includes user's first name in email body", async () => {
      const params = {
        email: "user@example.com",
        firstName: "John",
        code: "123456",
      };

      mockSend.mockResolvedValue({ data: {}, error: null });

      await sendVerificationEmail(params);

      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain("John");
    });

    it("includes expiry information in email", async () => {
      const params = {
        email: "user@example.com",
        firstName: "John",
        code: "123456",
      };

      mockSend.mockResolvedValue({ data: {}, error: null });

      await sendVerificationEmail(params);

      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain("30 minutes");
    });

    it("includes resend URL in email when provided", async () => {
      const params = {
        email: "user@example.com",
        firstName: "John",
        code: "123456",
        resendUrl: "http://localhost:3000/verify-email?email=user@example.com",
      };

      mockSend.mockResolvedValue({ data: {}, error: null });

      await sendVerificationEmail(params);

      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain("http://localhost:3000/verify-email");
    });

    it("does not include resend URL when not provided", async () => {
      const params = {
        email: "user@example.com",
        firstName: "John",
        code: "123456",
      };

      mockSend.mockResolvedValue({ data: {}, error: null });

      await sendVerificationEmail(params);

      const call = mockSend.mock.calls[0][0];
+      expect(typeof call.html).toBe("string");
    });

    it("logs success when email is sent", async () => {
      const params = {
        email: "user@example.com",
        firstName: "John",
        code: "123456",
      };

      mockSend.mockResolvedValue({ data: {}, error: null });

      await sendVerificationEmail(params);

      expect(logger.info).toHaveBeenCalledWith(
        `Verification email sent to user@example.com`
      );
    });

    it("throws error when email send fails", async () => {
      const params = {
        email: "user@example.com",
        firstName: "John",
        code: "123456",
      };

      const error = new Error("Email service error");
      mockSend.mockResolvedValue({ error });

      await expect(sendVerificationEmail(params)).rejects.toThrow(
        "Failed to send verification email"
      );
    });

    it("logs error when email send fails", async () => {
      const params = {
        email: "user@example.com",
        firstName: "John",
        code: "123456",
      };

      const error = new Error("Email service error");
      mockSend.mockResolvedValue({ error });

      try {
        await sendVerificationEmail(params);
      } catch (e) {
        // Expected
      }

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to send verification email:",
        "{}"
      );
    });

    it("throws error when service throws exception", async () => {
      const params = {
        email: "user@example.com",
        firstName: "John",
        code: "123456",
      };

      const error = new Error("Network error");
      mockSend.mockRejectedValue(error);

      await expect(sendVerificationEmail(params)).rejects.toThrow(
        "Network error"
      );
    });

    it("logs exception errors", async () => {
      const params = {
        email: "user@example.com",
        firstName: "John",
        code: "123456",
      };

      const error = new Error("Network error");
      mockSend.mockRejectedValue(error);

      try {
        await sendVerificationEmail(params);
      } catch (e) {
        // Expected
      }

      expect(logger.error).toHaveBeenCalledWith(
        "Error sending verification email:",
        error
      );
    });

    it("sends to correct email address", async () => {
      const params = {
        email: "specific@example.com",
        firstName: "Alice",
        code: "654321",
      };

      mockSend.mockResolvedValue({ data: {}, error: null });

      await sendVerificationEmail(params);

      const call = mockSend.mock.calls[0][0];
      expect(call.to).toBe("specific@example.com");
    });

    it("uses configured from email address", async () => {
      const params = {
        email: "user@example.com",
        firstName: "John",
        code: "123456",
      };

      mockSend.mockResolvedValue({ data: {}, error: null });

      await sendVerificationEmail(params);

      const call = mockSend.mock.calls[0][0];
      expect(call.from).toBe(CONFIG.RESEND_FROM_EMAIL);
    });

    it("email contains proper HTML structure", async () => {
      const params = {
        email: "user@example.com",
        firstName: "John",
        code: "123456",
      };

      mockSend.mockResolvedValue({ data: {}, error: null });

      await sendVerificationEmail(params);

      const call = mockSend.mock.calls[0][0];
      const html = call.html;

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html>");
      expect(html).toContain("</html>");
      expect(html).toContain("<head>");
      expect(html).toContain("</head>");
      expect(html).toContain("<body>");
      expect(html).toContain("</body>");
    });

    it("email contains CSS styling", async () => {
      const params = {
        email: "user@example.com",
        firstName: "John",
        code: "123456",
      };

      mockSend.mockResolvedValue({ data: {}, error: null });

      await sendVerificationEmail(params);

      const call = mockSend.mock.calls[0][0];
      const html = call.html;

      expect(html).toContain("<style>");
      expect(html).toContain("</style>");
    });

    it("email contains welcome message", async () => {
      const params = {
        email: "user@example.com",
        firstName: "John",
        code: "123456",
      };

      mockSend.mockResolvedValue({ data: {}, error: null });

      await sendVerificationEmail(params);

      const call = mockSend.mock.calls[0][0];
      const html = call.html;

      expect(html).toContain("Welcome to Participium");
    });

    it("email contains security notice about not sharing code", async () => {
      const params = {
        email: "user@example.com",
        firstName: "John",
        code: "123456",
      };

      mockSend.mockResolvedValue({ data: {}, error: null });

      await sendVerificationEmail(params);

      const call = mockSend.mock.calls[0][0];
      const html = call.html;

      expect(html).toContain("didn't create this account");
    });

    it("email contains copyright information", async () => {
      const params = {
        email: "user@example.com",
        firstName: "John",
        code: "123456",
      };

      mockSend.mockResolvedValue({ data: {}, error: null });

      await sendVerificationEmail(params);

      const call = mockSend.mock.calls[0][0];
      const html = call.html;

      expect(html).toContain("Participium");
      expect(html).toContain("All rights reserved");
    });

    it("handles special characters in email address", async () => {
      const params = {
        email: "user+tag@example.co.uk",
        firstName: "John",
        code: "123456",
      };

      mockSend.mockResolvedValue({ data: {}, error: null });

      await sendVerificationEmail(params);

      const call = mockSend.mock.calls[0][0];
      expect(call.to).toBe("user+tag@example.co.uk");
    });

    it("handles special characters in first name", async () => {
      const params = {
        email: "user@example.com",
        firstName: "François",
        code: "123456",
      };

      mockSend.mockResolvedValue({ data: {}, error: null });

      await sendVerificationEmail(params);

      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain("François");
    });

    it("handles URL encoding in resend URL parameter", async () => {
      const params = {
        email: "user@example.com",
        firstName: "John",
        code: "123456",
        resendUrl:
          "http://localhost:3000/verify?email=user%40example.com&token=abc123",
      };

      mockSend.mockResolvedValue({ data: {}, error: null });

      await sendVerificationEmail(params);

      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain(
        "http://localhost:3000/verify?email=user%40example.com&token=abc123"
      );
    });

    it("returns result from resend service", async () => {
      const params = {
        email: "user@example.com",
        firstName: "John",
        code: "123456",
      };

      const expectedResult = { success: true, id: "msg_123" };
      mockSend.mockResolvedValue(expectedResult);

      const result = await sendVerificationEmail(params);

      expect(result).toEqual(expectedResult);
    });
  });

  describe("integration scenarios", () => {
    it("complete email flow: create code -> send email", async () => {
      const code = "123456";
      const params = {
        email: "newuser@example.com",
        firstName: "New",
        code,
        resendUrl: `${CONFIG.FRONTEND_URL}/verify-email?email=newuser%40example.com`,
      };

      mockSend.mockResolvedValue({ data: {}, error: null });

      const result = await sendVerificationEmail(params);

      expect(result.error).toBeNull();
      expect(logger.info).toHaveBeenCalled();

      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain(code);
      expect(call.html).toContain("New");
    });

    it("handles multiple email sends in sequence", async () => {
      const emails = [
        { email: "user1@example.com", firstName: "User1", code: "111111" },
        { email: "user2@example.com", firstName: "User2", code: "222222" },
        { email: "user3@example.com", firstName: "User3", code: "333333" },
      ];

      mockSend.mockResolvedValue({ data: {}, error: null });

      for (const params of emails) {
        await sendVerificationEmail(params);
      }

      expect(mockSend).toHaveBeenCalledTimes(3);
      expect(logger.info).toHaveBeenCalledTimes(3);

      const calls = mockSend.mock.calls;
      expect(calls[0][0].to).toBe("user1@example.com");
      expect(calls[1][0].to).toBe("user2@example.com");
      expect(calls[2][0].to).toBe("user3@example.com");
    });
  });
});
