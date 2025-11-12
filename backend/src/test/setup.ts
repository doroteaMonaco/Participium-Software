// Mock Redis client before any imports
jest.mock('../database/redis', () => {
  const mockRedisClient = {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    quit: jest.fn(),
    on: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockRedisClient,
  };
});

// Mock Prisma client
jest.mock('../database/connection', () => {
  const mockPrismaClient = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    report: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    municipality_role: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $disconnect: jest.fn(),
  };
  return {
    __esModule: true,
    prisma: mockPrismaClient,  
    initializeDatabase: jest.fn(),
    closeDatabase: jest.fn(),
  };
});
