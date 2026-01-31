/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any, @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { SchedulingService } from './scheduling.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockPrismaService, resetPrismaMocks } from '../test-utils/prisma-mock';

describe('SchedulingService', () => {
  let service: SchedulingService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    resetPrismaMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SchedulingService>(SchedulingService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTeamSchedules', () => {
    const tenantId = 'tenant-1';

    it('should return team schedules for next 7 days', async () => {
      const now = new Date('2026-01-29T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const mockSchedules = [
        {
          id: 'schedule-1',
          tenantId,
          date: new Date('2026-01-30T00:00:00Z'),
          isPublished: true,
          user: {
            firstName: 'John',
            lastName: 'Doe',
          },
          shift: {
            name: 'Morning Shift',
            location: {
              name: 'Office A',
            },
          },
        },
        {
          id: 'schedule-2',
          tenantId,
          date: new Date('2026-01-31T00:00:00Z'),
          isPublished: true,
          user: {
            firstName: 'Jane',
            lastName: 'Smith',
          },
          shift: {
            name: 'Evening Shift',
            location: {
              name: 'Office B',
            },
          },
        },
        {
          id: 'schedule-3',
          tenantId,
          date: new Date('2026-02-02T00:00:00Z'),
          isPublished: true,
          user: {
            firstName: 'Bob',
            lastName: 'Johnson',
          },
          shift: {
            name: 'Night Shift',
            location: {
              name: 'Warehouse',
            },
          },
        },
      ];

      prisma.schedule.findMany.mockResolvedValue(mockSchedules);

      const result = await service.getTeamSchedules(tenantId);

      expect(result).toEqual([
        {
          date: '2026-01-30',
          user: 'John Doe',
          shift: 'Morning Shift',
          location: 'Office A',
        },
        {
          date: '2026-01-31',
          user: 'Jane Smith',
          shift: 'Evening Shift',
          location: 'Office B',
        },
        {
          date: '2026-02-02',
          user: 'Bob Johnson',
          shift: 'Night Shift',
          location: 'Warehouse',
        },
      ]);

      expect(prisma.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId,
            date: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
            isPublished: true,
          },
          orderBy: { date: 'asc' },
        }),
      );

      jest.useRealTimers();
    });

    it('should filter by date range (today to 7 days later)', async () => {
      const now = new Date('2026-01-29T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      prisma.schedule.findMany.mockResolvedValue([]);

      await service.getTeamSchedules(tenantId);

      const callArgs = prisma.schedule.findMany.mock.calls[0][0];
      const dateFilter = callArgs.where.date;

      // Verify date range
      expect(dateFilter.gte.getFullYear()).toBe(2026);
      expect(dateFilter.gte.getMonth()).toBe(0); // January
      expect(dateFilter.gte.getDate()).toBe(29); // Today

      expect(dateFilter.lte.getFullYear()).toBe(2026);
      expect(dateFilter.lte.getMonth()).toBe(1); // February
      expect(dateFilter.lte.getDate()).toBe(5); // 7 days later

      jest.useRealTimers();
    });

    it('should only return published schedules', async () => {
      prisma.schedule.findMany.mockResolvedValue([]);

      await service.getTeamSchedules(tenantId);

      expect(prisma.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isPublished: true,
          }),
        }),
      );
    });

    it('should verify tenant isolation', async () => {
      prisma.schedule.findMany.mockResolvedValue([]);

      await service.getTeamSchedules(tenantId);

      expect(prisma.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
          }),
        }),
      );
    });

    it('should return empty array if no schedules found', async () => {
      prisma.schedule.findMany.mockResolvedValue([]);

      const result = await service.getTeamSchedules(tenantId);

      expect(result).toEqual([]);
    });

    it('should filter out schedules with missing user or location', async () => {
      const mockSchedules = [
        {
          id: 'schedule-1',
          tenantId,
          date: new Date('2026-01-30T00:00:00Z'),
          isPublished: true,
          user: {
            firstName: 'John',
            lastName: 'Doe',
          },
          shift: {
            name: 'Morning Shift',
            location: {
              name: 'Office A',
            },
          },
        },
        {
          id: 'schedule-2',
          tenantId,
          date: new Date('2026-01-31T00:00:00Z'),
          isPublished: true,
          user: null, // Missing user
          shift: {
            name: 'Evening Shift',
            location: {
              name: 'Office B',
            },
          },
        },
        {
          id: 'schedule-3',
          tenantId,
          date: new Date('2026-02-01T00:00:00Z'),
          isPublished: true,
          user: {
            firstName: 'Jane',
            lastName: 'Smith',
          },
          shift: {
            name: 'Night Shift',
            location: null, // Missing location
          },
        },
        {
          id: 'schedule-4',
          tenantId,
          date: new Date('2026-02-02T00:00:00Z'),
          isPublished: true,
          user: {
            firstName: 'Bob',
            lastName: 'Wilson',
          },
          shift: {
            name: 'Day Shift',
            location: {
              name: 'Warehouse',
            },
          },
        },
      ];

      prisma.schedule.findMany.mockResolvedValue(mockSchedules);

      const result = await service.getTeamSchedules(tenantId);

      // Should only return schedules with both user and location
      expect(result).toHaveLength(2);
      expect(result[0].user).toBe('John Doe');
      expect(result[1].user).toBe('Bob Wilson');
    });

    it('should format date as ISO date string (YYYY-MM-DD)', async () => {
      const mockSchedules = [
        {
          id: 'schedule-1',
          tenantId,
          date: new Date('2026-01-30T14:30:00Z'), // Has time component
          isPublished: true,
          user: {
            firstName: 'John',
            lastName: 'Doe',
          },
          shift: {
            name: 'Morning Shift',
            location: {
              name: 'Office A',
            },
          },
        },
      ];

      prisma.schedule.findMany.mockResolvedValue(mockSchedules);

      const result = await service.getTeamSchedules(tenantId);

      // Should return only the date part
      expect(result[0].date).toBe('2026-01-30');
      expect(result[0].date).not.toContain('T');
      expect(result[0].date).not.toContain(':');
    });

    it('should include user, shift, and location relations', async () => {
      prisma.schedule.findMany.mockResolvedValue([]);

      await service.getTeamSchedules(tenantId);

      expect(prisma.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            user: { select: { firstName: true, lastName: true } },
            shift: {
              select: {
                name: true,
              },
              include: {
                location: { select: { name: true } },
              },
            },
          },
        }),
      );
    });

    it('should order schedules by date ascending', async () => {
      prisma.schedule.findMany.mockResolvedValue([]);

      await service.getTeamSchedules(tenantId);

      expect(prisma.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { date: 'asc' },
        }),
      );
    });

    it('should map all schedule fields correctly', async () => {
      const mockSchedules = [
        {
          id: 'schedule-1',
          tenantId,
          date: new Date('2026-01-30T00:00:00Z'),
          isPublished: true,
          user: {
            firstName: 'Alice',
            lastName: 'Cooper',
          },
          shift: {
            name: 'Split Shift',
            location: {
              name: 'Remote',
            },
          },
        },
      ];

      prisma.schedule.findMany.mockResolvedValue(mockSchedules);

      const result = await service.getTeamSchedules(tenantId);

      expect(result[0]).toEqual({
        date: '2026-01-30',
        user: 'Alice Cooper',
        shift: 'Split Shift',
        location: 'Remote',
      });
    });

    it('should handle schedules across month boundaries', async () => {
      const now = new Date('2026-01-28T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const mockSchedules = [
        {
          id: 'schedule-1',
          tenantId,
          date: new Date('2026-01-29T00:00:00Z'), // January
          isPublished: true,
          user: {
            firstName: 'John',
            lastName: 'Doe',
          },
          shift: {
            name: 'Shift A',
            location: {
              name: 'Office',
            },
          },
        },
        {
          id: 'schedule-2',
          tenantId,
          date: new Date('2026-02-03T00:00:00Z'), // February
          isPublished: true,
          user: {
            firstName: 'Jane',
            lastName: 'Smith',
          },
          shift: {
            name: 'Shift B',
            location: {
              name: 'Warehouse',
            },
          },
        },
      ];

      prisma.schedule.findMany.mockResolvedValue(mockSchedules);

      const result = await service.getTeamSchedules(tenantId);

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2026-01-29');
      expect(result[1].date).toBe('2026-02-03');

      jest.useRealTimers();
    });
  });
});
