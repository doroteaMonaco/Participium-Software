// E2E tests setup - globalSetup handles Prisma initialization

jest.mock("@database/redis", () => {
  const mockClient = {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  };
  return mockClient;
});
