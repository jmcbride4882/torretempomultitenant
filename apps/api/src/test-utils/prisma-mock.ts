/**
 * Mock Prisma Service for Unit Tests
 * Provides jest.fn() mocks for all Prisma model methods
 */

type MockPrismaService = {
  user: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  tenant: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  timeEntry: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
    groupBy: jest.Mock;
  };
  location: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
  };
  qrToken: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  auditLog: {
    create: jest.Mock;
    findMany: jest.Mock;
  };
  editRequest: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  schedule: {
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  shift: {
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  report: {
    findMany: jest.Mock;
    create: jest.Mock;
  };
  signature: {
    findFirst: jest.Mock;
    create: jest.Mock;
  };
  breakEntry: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  overtimeEntry: {
    findMany: jest.Mock;
    create: jest.Mock;
  };
  $transaction: jest.Mock;
  $executeRawUnsafe: jest.Mock;
  $connect: jest.Mock;
  $disconnect: jest.Mock;
};

export const mockPrismaService: MockPrismaService = {
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
    groupBy: jest.fn(),
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
  breakEntry: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  overtimeEntry: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn((callback: unknown) => {
    if (typeof callback === 'function') {
      return callback(mockPrismaService) as unknown;
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
    const value = mockPrismaService[key as keyof MockPrismaService];
    if (typeof value === 'object' && value !== null) {
      Object.keys(value).forEach((method) => {
        const mockFn = (value as Record<string, unknown>)[method];
        if (jest.isMockFunction(mockFn)) {
          mockFn.mockReset();
        }
      });
    } else if (jest.isMockFunction(value)) {
      value.mockReset();
    }
  });
};
