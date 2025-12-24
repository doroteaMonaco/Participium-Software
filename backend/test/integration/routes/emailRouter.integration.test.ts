import request from "supertest";
import app from "@app";
import * as emailService from "@services/emailService";

describe("Email Routes - Integration Tests", () => {
  describe("POST /api/email/send-verification", () => {
    it("200 sends verification email successfully", async () => {
      const payload = {
        email: "test@example.com",
        firstName: "Test",
        code: "123456",
        resendUrl: "https://frontend/verify?email=test@example.com",
      };

      const sendMock = emailService.sendVerificationEmail as jest.Mock;
      sendMock.mockResolvedValue({ code: payload.code });

      const res = await request(app)
        .post("/api/email/send-verification")
        .send(payload)
        .expect(200);

      expect(res.body).toHaveProperty("success", true);
      expect(sendMock).toHaveBeenCalled();
    });

    it("400 when required fields are missing", async () => {
      // omit `code` which is required by controller
      await request(app)
        .post("/api/email/send-verification")
        .send({ email: "a@b.com", firstName: "A" })
        .expect(400);
    });

    it("500 when email service fails", async () => {
      const payload = {
        email: "fail@example.com",
        firstName: "Fail",
        code: "999999",
      };

      const sendMock = emailService.sendVerificationEmail as jest.Mock;
      sendMock.mockRejectedValue(new Error("Email provider error"));

      await request(app)
        .post("/api/email/send-verification")
        .send(payload)
        .expect(500);
    });
  });
});
