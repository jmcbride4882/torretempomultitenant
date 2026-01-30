import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockPrismaService, resetPrismaMocks } from '../test-utils/prisma-mock';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    resetPrismaMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    const tenantId = 'tenant-1';

    it('should return dashboard statistics with compliance score', async () => {
      const now = new Date('2026-01-29T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      // Mock counts
      prisma.user.count.mockResolvedValueOnce(25); // totalUsers
      prisma.user.count.mockResolvedValueOnce(20); // activeUsers
      prisma.location.count.mockResolvedValue(5); // totalLocations

      // Mock time entries with some having warnings
      const timeEntries = [
        { id: 'entry-1', validationWarning: null },
        { id: 'entry-2', validationWarning: '' },
        { id: 'entry-3', validationWarning: 'Warning message' },
        { id: 'entry-4', validationWarning: null },
      ];
      prisma.timeEntry.findMany.mockResolvedValue(timeEntries);

      const result = await service.getDashboardStats(tenantId);

      expect(result).toEqual({
        totalUsers: 25,
        activeUsers: 20,
        totalLocations: 5,
        totalEntriesThisMonth: 4,
        complianceScore: 75, // 3 out of 4 entries are compliant
      });

      expect(prisma.user.count).toHaveBeenCalledTimes(2);
      expect(prisma.location.count).toHaveBeenCalledWith({
        where: { tenantId },
      });
      expect(prisma.timeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId,
            clockIn: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          },
        }),
      );

      jest.useRealTimers();
    });

    it('should return 100% compliance score if no entries exist', async () => {
      prisma.user.count.mockResolvedValue(10);
      prisma.location.count.mockResolvedValue(3);
      prisma.timeEntry.findMany.mockResolvedValue([]);

      const result = await service.getDashboardStats(tenantId);

      expect(result).toEqual({
        totalUsers: 10,
        activeUsers: 10,
        totalLocations: 3,
        totalEntriesThisMonth: 0,
        complianceScore: 100,
      });
    });

    it('should return 0% compliance score if all entries have warnings', async () => {
      prisma.user.count.mockResolvedValue(5);
      prisma.location.count.mockResolvedValue(2);
      prisma.timeEntry.findMany.mockResolvedValue([
        { id: 'entry-1', validationWarning: 'Warning 1' },
        { id: 'entry-2', validationWarning: 'Warning 2' },
        { id: 'entry-3', validationWarning: 'Warning 3' },
      ]);

      const result = await service.getDashboardStats(tenantId);

      expect(result.complianceScore).toBe(0);
      expect(result.totalEntriesThisMonth).toBe(3);
    });

    it('should filter time entries by current month date range', async () => {
      const now = new Date('2026-01-15T10:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      prisma.user.count.mockResolvedValue(10);
      prisma.location.count.mockResolvedValue(2);
      prisma.timeEntry.findMany.mockResolvedValue([]);

      await service.getDashboardStats(tenantId);

      const callArgs = prisma.timeEntry.findMany.mock.calls[0][0];
      const clockInFilter = callArgs.where.clockIn;

      // Verify date range is start to end of current month
      expect(clockInFilter.gte.getMonth()).toBe(0); // January (0-indexed)
      expect(clockInFilter.gte.getDate()).toBe(1); // 1st day
      expect(clockInFilter.lte.getMonth()).toBe(0); // January
      expect(clockInFilter.lte.getDate()).toBe(31); // Last day of January

      jest.useRealTimers();
    });

    it('should verify tenant isolation in all queries', async () => {
      prisma.user.count.mockResolvedValue(0);
      prisma.location.count.mockResolvedValue(0);
      prisma.timeEntry.findMany.mockResolvedValue([]);

      await service.getDashboardStats(tenantId);

      // Verify all queries include tenantId
      expect(prisma.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId }),
        }),
      );
      expect(prisma.location.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId },
        }),
      );
      expect(prisma.timeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId }),
        }),
      );
    });
  });

  describe('getRecentActivity', () => {
    const tenantId = 'tenant-1';

    it('should return formatted activity feed from audit logs', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          tenantId,
          action: 'TIME_ENTRY_CREATED',
          entity: 'TIME_ENTRY',
          entityId: 'entry-123',
          actorEmail: 'john@example.com',
          createdAt: new Date('2026-01-29T10:00:00Z'),
        },
        {
          id: 'log-2',
          tenantId,
          action: 'USER_LOGIN',
          entity: 'USER',
          entityId: 'user-456',
          actorEmail: 'jane@example.com',
          createdAt: new Date('2026-01-29T09:00:00Z'),
        },
        {
          id: 'log-3',
          tenantId,
          action: 'EDIT_REQUEST_APPROVED',
          entity: 'EDIT_REQUEST',
          entityId: 'req-789',
          actorEmail: null,
          createdAt: new Date('2026-01-29T08:00:00Z'),
        },
      ];

      prisma.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getRecentActivity(tenantId);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        timestamp: '2026-01-29T10:00:00.000Z',
        user: 'john@example.com',
        action: 'Clocked in',
        details: 'Clocked in (TIME_ENTRY entry-12)', // substring(0, 8) of 'entry-123'
      });
      expect(result[1]).toEqual({
        timestamp: '2026-01-29T09:00:00.000Z',
        user: 'jane@example.com',
        action: 'Logged in',
        details: 'Logged in (USER user-456)', // substring(0, 8) of 'user-456'
      });
      expect(result[2]).toEqual({
        timestamp: '2026-01-29T08:00:00.000Z',
        user: 'System',
        action: 'Approved edit request',
        details: 'Approved edit request (EDIT_REQUEST req-789)', // substring(0, 8) of 'req-789'
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should respect custom limit parameter', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);

      await service.getRecentActivity(tenantId, 10);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });

    it('should handle empty audit logs', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);

      const result = await service.getRecentActivity(tenantId);

      expect(result).toEqual([]);
    });

    it('should map various action types correctly', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          tenantId,
          action: 'TIME_ENTRY_UPDATED',
          entity: 'TIME_ENTRY',
          entityId: 'entry-1',
          actorEmail: 'user@example.com',
          createdAt: new Date(),
        },
        {
          id: 'log-2',
          tenantId,
          action: 'EDIT_REQUEST_REJECTED',
          entity: 'EDIT_REQUEST',
          entityId: 'req-2',
          actorEmail: 'admin@example.com',
          createdAt: new Date(),
        },
        {
          id: 'log-3',
          tenantId,
          action: 'LOCATION_CREATED',
          entity: 'LOCATION',
          entityId: 'loc-3',
          actorEmail: 'admin@example.com',
          createdAt: new Date(),
        },
        {
          id: 'log-4',
          tenantId,
          action: 'REPORT_GENERATED',
          entity: 'REPORT',
          entityId: 'rep-4',
          actorEmail: 'manager@example.com',
          createdAt: new Date(),
        },
      ];

      prisma.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getRecentActivity(tenantId);

      expect(result[0].action).toBe('Modified time entry');
      expect(result[1].action).toBe('Rejected edit request');
      expect(result[2].action).toBe('Location created');
      expect(result[3].action).toBe('Report generated');
    });

    it('should use System as user when actorEmail is null', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          tenantId,
          action: 'USER_CREATED',
          entity: 'USER',
          entityId: 'user-1',
          actorEmail: null,
          createdAt: new Date(),
        },
      ];

      prisma.auditLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getRecentActivity(tenantId);

      expect(result[0].user).toBe('System');
    });

    it('should use default limit of 50 if not specified', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);

      await service.getRecentActivity(tenantId);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        }),
      );
    });

    it('should order by createdAt descending', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);

      await service.getRecentActivity(tenantId);

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });
});
