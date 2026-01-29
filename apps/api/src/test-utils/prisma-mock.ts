/**
 * Mock Prisma Service for Unit Tests
 * Provides jest.fn() mocks for all Prisma model methods
 */

export const mockPrismaService: any = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  tenant: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  timeEntry: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  location: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  qrToken: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  editRequest: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  schedule: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  shift: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  report: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  signature: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn((callback) => {
    if (typeof callback === 'function') {
      return callback(mockPrismaService);
    }
    return Promise.resolve(callback);
  }),
  $executeRawUnsafe: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

/**
 * Reset all mocks before each test
 */
export const resetPrismaMocks = (): void => {
  Object.keys(mockPrismaService).forEach((key) => {
    if (typeof mockPrismaService[key] === 'object') {
      Object.keys(mockPrismaService[key]).forEach((method) => {
        if (jest.isMockFunction(mockPrismaService[key][method])) {
          mockPrismaService[key][method].mockReset();
        }
      });
    } else if (jest.isMockFunction(mockPrismaService[key])) {
      mockPrismaService[key].mockReset();
    }
  });
};
