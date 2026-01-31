/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any, @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { GlobalAdminService } from './global-admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockPrismaService, resetPrismaMocks } from '../test-utils/prisma-mock';

describe('GlobalAdminService', () => {
  let service: GlobalAdminService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    resetPrismaMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalAdminService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<GlobalAdminService>(GlobalAdminService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSystemStats', () => {
    it('should return system-wide statistics across all tenants', async () => {
      const now = new Date('2026-01-29T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      // Mock tenant count
      prisma.tenant.count.mockResolvedValue(50);

      // Mock user count
      prisma.user.count.mockResolvedValue(1000);

      // Mock active tenants (tenants with entries in last 30 days)
      prisma.timeEntry.groupBy = jest.fn().mockResolvedValue([
        { tenantId: 'tenant-1', _count: 10 },
        { tenantId: 'tenant-2', _count: 5 },
        { tenantId: 'tenant-3', _count: 15 },
      ]);

      // Mock entries this month
      prisma.timeEntry.count.mockResolvedValue(5000);

      const result = await service.getSystemStats();

      expect(result).toEqual({
        totalTenants: 50,
        activeTenants: 3,
        totalUsers: 1000,
        totalEntriesThisMonth: 5000,
      });

      expect(prisma.tenant.count).toHaveBeenCalledWith();
      expect(prisma.user.count).toHaveBeenCalledWith();
      expect(prisma.timeEntry.groupBy).toHaveBeenCalled();
      expect(prisma.timeEntry.count).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should handle zero tenants and users', async () => {
      prisma.tenant.count.mockResolvedValue(0);
      prisma.user.count.mockResolvedValue(0);
      prisma.timeEntry.groupBy = jest.fn().mockResolvedValue([]);
      prisma.timeEntry.count.mockResolvedValue(0);

      const result = await service.getSystemStats();

      expect(result).toEqual({
        totalTenants: 0,
        activeTenants: 0,
        totalUsers: 0,
        totalEntriesThisMonth: 0,
      });
    });

    it('should calculate active tenants based on last 30 days', async () => {
      const now = new Date('2026-01-29T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      prisma.tenant.count.mockResolvedValue(10);
      prisma.user.count.mockResolvedValue(100);
      prisma.timeEntry.count.mockResolvedValue(500);

      // Mock 5 active tenants
      prisma.timeEntry.groupBy = jest.fn().mockResolvedValue([
        { tenantId: 'tenant-1', _count: 1 },
        { tenantId: 'tenant-2', _count: 1 },
        { tenantId: 'tenant-3', _count: 1 },
        { tenantId: 'tenant-4', _count: 1 },
        { tenantId: 'tenant-5', _count: 1 },
      ]);

      const result = await service.getSystemStats();

      expect(result.activeTenants).toBe(5);

      // Verify groupBy was called with correct date filter
      const groupByCall = prisma.timeEntry.groupBy.mock.calls[0][0];
      expect(groupByCall.where.createdAt.gte).toBeDefined();

      // Calculate expected date (30 days ago)
      const expectedDate = new Date(now);
      expectedDate.setDate(expectedDate.getDate() - 30);
      
      const actualDate = groupByCall.where.createdAt.gte;
      expect(actualDate.getTime()).toBeCloseTo(expectedDate.getTime(), -5); // Within 100ms

      jest.useRealTimers();
    });

    it('should filter entries this month by start of month', async () => {
      const now = new Date('2026-01-15T10:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      prisma.tenant.count.mockResolvedValue(5);
      prisma.user.count.mockResolvedValue(50);
      prisma.timeEntry.groupBy = jest.fn().mockResolvedValue([]);
      prisma.timeEntry.count.mockResolvedValue(100);

      await service.getSystemStats();

      // Verify count was called with correct date filter
      const countCall = prisma.timeEntry.count.mock.calls[0][0];
      expect(countCall.where.createdAt.gte).toBeDefined();

      // Verify it's the start of the current month
      const filterDate = countCall.where.createdAt.gte;
      expect(filterDate.getDate()).toBe(1); // 1st day of month
      expect(filterDate.getMonth()).toBe(0); // January (0-indexed)
      expect(filterDate.getHours()).toBe(0);
      expect(filterDate.getMinutes()).toBe(0);

      jest.useRealTimers();
    });

    it('should NOT filter by tenantId (global stats)', async () => {
      prisma.tenant.count.mockResolvedValue(1);
      prisma.user.count.mockResolvedValue(10);
      prisma.timeEntry.groupBy = jest.fn().mockResolvedValue([]);
      prisma.timeEntry.count.mockResolvedValue(5);

      await service.getSystemStats();

      // Verify NO tenantId filter is applied to counts
      expect(prisma.tenant.count).toHaveBeenCalledWith();
      expect(prisma.user.count).toHaveBeenCalledWith();

      // Verify groupBy has date filter but NOT tenantId
      const groupByCall = prisma.timeEntry.groupBy.mock.calls[0][0];
      expect(groupByCall.where).toBeDefined();
      expect(groupByCall.where.createdAt).toBeDefined();
      expect(groupByCall.where.tenantId).toBeUndefined();

      // Verify count has date filter but NOT tenantId
      const countCall = prisma.timeEntry.count.mock.calls[0][0];
      expect(countCall.where).toBeDefined();
      expect(countCall.where.createdAt).toBeDefined();
      expect(countCall.where.tenantId).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database connection failed');
      prisma.tenant.count.mockRejectedValue(error);

      await expect(service.getSystemStats()).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should group time entries by tenantId for active tenant count', async () => {
      prisma.tenant.count.mockResolvedValue(20);
      prisma.user.count.mockResolvedValue(200);
      prisma.timeEntry.count.mockResolvedValue(1000);

      // Mock different tenants with different entry counts
      prisma.timeEntry.groupBy = jest.fn().mockResolvedValue([
        { tenantId: 'tenant-a', _count: 100 },
        { tenantId: 'tenant-b', _count: 50 },
        { tenantId: 'tenant-c', _count: 200 },
        { tenantId: 'tenant-d', _count: 10 },
      ]);

      const result = await service.getSystemStats();

      expect(result.activeTenants).toBe(4);
      
      // Verify groupBy parameters
      const groupByCall = prisma.timeEntry.groupBy.mock.calls[0][0];
      expect(groupByCall.by).toEqual(['tenantId']);
      expect(groupByCall._count).toBe(true);
    });

    it('should execute all queries in parallel', async () => {
      prisma.tenant.count.mockResolvedValue(10);
      prisma.user.count.mockResolvedValue(100);
      prisma.timeEntry.groupBy = jest.fn().mockResolvedValue([]);
      prisma.timeEntry.count.mockResolvedValue(500);

      await service.getSystemStats();

      // All 4 queries should have been initiated
      expect(prisma.tenant.count).toHaveBeenCalledTimes(1);
      expect(prisma.user.count).toHaveBeenCalledTimes(1);
      expect(prisma.timeEntry.groupBy).toHaveBeenCalledTimes(1);
      expect(prisma.timeEntry.count).toHaveBeenCalledTimes(1);
    });
  });
});
