// Integration test environment setup: mock email sending to avoid external calls

jest.mock("@services/emailService", () => {
  const fn = jest.fn(async (params: any) => {
    const code = params?.code;
    // expose last sent code for tests
    (global as any).__lastSentVerificationCode = code;
    (global as any).__mockSendVerificationEmailCalls =
      ((global as any).__mockSendVerificationEmailCalls || 0) + 1;
    // eslint-disable-next-line no-console
    console.log("[mockEmailService] sendVerificationEmail called, code=", code);
    return { code };
  });

  return {
    __esModule: true,
    sendVerificationEmail: fn,
    default: { sendVerificationEmail: fn },
  };
});
