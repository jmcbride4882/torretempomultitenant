import { Test, TestingModule } from '@nestjs/testing';
import { ComplianceService } from './compliance.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { mockPrismaService, resetPrismaMocks } from '../test-utils/prisma-mock';
import { EntryStatus } from '@prisma/client';
import { addHours, addDays, subHours, subDays } from 'date-fns';

describe('ComplianceService', () => {
  let service: ComplianceService;
  let prisma: typeof mockPrismaService;
  let tenantsService: TenantsService;

  const mockTenant = {
    id: 'tenant-1',
    name: 'Test Company',
    slug: 'test-company',
    timezone: 'Europe/Madrid',
    locale: 'es',
    convenioCode: null,
    maxWeeklyHours: 40,
    maxAnnualHours: 1822,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    resetPrismaMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TenantsService,
          useValue: {
            getTenant: jest.fn().mockResolvedValue(mockTenant),
          },
        },
      ],
    }).compile();

    service = module.get<ComplianceService>(ComplianceService);
    prisma = module.get(PrismaService);
    tenantsService = module.get<TenantsService>(TenantsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateRestPeriod', () => {
    const userId = 'user-1';
    const tenantId = 'tenant-1';

    it('should block clock-in if less than 12 hours since last clock-out', async () => {
      const now = new Date();
      const lastClockOut = subHours(now, 10); // Only 10 hours ago

      prisma.timeEntry.findFirst.mockResolvedValue({
        id: 'entry-1',
        userId,
        tenantId,
        clockIn: subHours(lastClockOut, 8),
        clockOut: lastClockOut,
        status: EntryStatus.ACTIVE,
      });

      const result = await service.validateRestPeriod(userId, tenantId);

      expect(result.isCompliant).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].code).toBe('REST_PERIOD_INSUFFICIENT');
      expect(result.violations[0].severity).toBe('BLOCKING');
    });

    it('should allow clock-in if more than 12 hours since last clock-out', async () => {
      const now = new Date();
      const lastClockOut = subHours(now, 13); // 13 hours ago

      prisma.timeEntry.findFirst.mockResolvedValue({
        id: 'entry-1',
        userId,
        tenantId,
        clockIn: subHours(lastClockOut, 8),
        clockOut: lastClockOut,
        status: EntryStatus.ACTIVE,
      });

      const result = await service.validateRestPeriod(userId, tenantId);

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should allow clock-in if no previous entry exists', async () => {
      prisma.timeEntry.findFirst.mockResolvedValue(null);

      const result = await service.validateRestPeriod(userId, tenantId);

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should allow clock-in if last entry has no clock-out', async () => {
      prisma.timeEntry.findFirst.mockResolvedValue({
        id: 'entry-1',
        userId,
        tenantId,
        clockIn: subHours(new Date(), 2),
        clockOut: null,
        status: EntryStatus.ACTIVE,
      });

      const result = await service.validateRestPeriod(userId, tenantId);

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('validateDailyHours', () => {
    const userId = 'user-1';
    const tenantId = 'tenant-1';
    const date = new Date('2026-01-29T10:00:00Z');

    it('should block clock-in if daily limit (9 hours) is reached', async () => {
      const clockIn = new Date('2026-01-29T00:00:00Z');
      const clockOut = new Date('2026-01-29T09:00:00Z'); // 9 hours worked

      prisma.timeEntry.findMany.mockResolvedValue([
        {
          id: 'entry-1',
          userId,
          tenantId,
          clockIn,
          clockOut,
          breakMinutes: 0,
          status: EntryStatus.ACTIVE,
        },
      ]);

      const result = await service.validateDailyHours(userId, tenantId, date);

      expect(result.isCompliant).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].code).toBe('DAILY_HOURS_LIMIT_REACHED');
      expect(result.violations[0].severity).toBe('BLOCKING');
    });

    it('should warn if daily hours exceed 8 hours but less than 9', async () => {
      const clockIn = new Date('2026-01-29T00:00:00Z');
      const clockOut = new Date('2026-01-29T08:30:00Z'); // 8.5 hours worked

      prisma.timeEntry.findMany.mockResolvedValue([
        {
          id: 'entry-1',
          userId,
          tenantId,
          clockIn,
          clockOut,
          breakMinutes: 0,
          status: EntryStatus.ACTIVE,
        },
      ]);

      const result = await service.validateDailyHours(userId, tenantId, date);

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('DAILY_HOURS_WARNING');
    });

    it('should allow clock-in if daily hours are under 8', async () => {
      const clockIn = new Date('2026-01-29T00:00:00Z');
      const clockOut = new Date('2026-01-29T07:00:00Z'); // 7 hours worked

      prisma.timeEntry.findMany.mockResolvedValue([
        {
          id: 'entry-1',
          userId,
          tenantId,
          clockIn,
          clockOut,
          breakMinutes: 0,
          status: EntryStatus.ACTIVE,
        },
      ]);

      const result = await service.validateDailyHours(userId, tenantId, date);

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should account for break minutes in daily hours calculation', async () => {
      const clockIn = new Date('2026-01-29T00:00:00Z');
      const clockOut = new Date('2026-01-29T09:30:00Z'); // 9.5 hours total
      const breakMinutes = 30; // 30 minutes break = 9 hours worked

      prisma.timeEntry.findMany.mockResolvedValue([
        {
          id: 'entry-1',
          userId,
          tenantId,
          clockIn,
          clockOut,
          breakMinutes,
          status: EntryStatus.ACTIVE,
        },
      ]);

      const result = await service.validateDailyHours(userId, tenantId, date);

      // Should trigger limit since 9 hours exactly
      expect(result.isCompliant).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].code).toBe('DAILY_HOURS_LIMIT_REACHED');
    });
  });

  describe('validateWeeklyHours', () => {
    const userId = 'user-1';
    const tenantId = 'tenant-1';
    const weekStart = new Date('2026-01-26T00:00:00Z'); // Monday

    it('should block clock-in if weekly limit is reached', async () => {
      // Mock 40 hours of work across the week
      const entries = Array.from({ length: 5 }, (_, i) => ({
        id: `entry-${i}`,
        userId,
        tenantId,
        clockIn: addHours(new Date('2026-01-26T08:00:00Z'), i * 24),
        clockOut: addHours(new Date('2026-01-26T16:00:00Z'), i * 24), // 8 hours each
        breakMinutes: 0,
        status: EntryStatus.ACTIVE,
      }));

      prisma.timeEntry.findMany.mockResolvedValue(entries);

      const result = await service.validateWeeklyHours(userId, tenantId, weekStart);

      expect(result.isCompliant).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].code).toBe('WEEKLY_HOURS_LIMIT_REACHED');
    });

    it('should warn if approaching weekly limit (90%)', async () => {
      // Mock 36 hours of work (90% of 40)
      const entries = Array.from({ length: 5 }, (_, i) => ({
        id: `entry-${i}`,
        userId,
        tenantId,
        clockIn: addHours(new Date('2026-01-26T08:00:00Z'), i * 24),
        clockOut: addHours(new Date('2026-01-26T15:12:00Z'), i * 24), // 7.2 hours each
        breakMinutes: 0,
        status: EntryStatus.ACTIVE,
      }));

      prisma.timeEntry.findMany.mockResolvedValue(entries);

      const result = await service.validateWeeklyHours(userId, tenantId, weekStart);

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('WEEKLY_HOURS_WARNING');
    });

    it('should allow clock-in if weekly hours are under limit', async () => {
      // Mock 30 hours of work
      const entries = Array.from({ length: 5 }, (_, i) => ({
        id: `entry-${i}`,
        userId,
        tenantId,
        clockIn: addHours(new Date('2026-01-26T08:00:00Z'), i * 24),
        clockOut: addHours(new Date('2026-01-26T14:00:00Z'), i * 24), // 6 hours each
        breakMinutes: 0,
        status: EntryStatus.ACTIVE,
      }));

      prisma.timeEntry.findMany.mockResolvedValue(entries);

      const result = await service.validateWeeklyHours(userId, tenantId, weekStart);

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('validateAnnualHours', () => {
    const userId = 'user-1';
    const tenantId = 'tenant-1';
    const year = 2026;

    it('should block clock-in if annual limit is reached', async () => {
      // Mock entries totaling 1822 hours (annual limit)
      prisma.timeEntry.findMany.mockResolvedValue([
        {
          id: 'entry-1',
          userId,
          tenantId,
          clockIn: new Date('2026-01-01T00:00:00Z'),
          clockOut: addHours(new Date('2026-01-01T00:00:00Z'), 1822),
          breakMinutes: 0,
          status: EntryStatus.ACTIVE,
        },
      ]);

      const result = await service.validateAnnualHours(userId, tenantId, year);

      expect(result.isCompliant).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].code).toBe('ANNUAL_HOURS_LIMIT_REACHED');
    });

    it('should warn if approaching annual limit (90%)', async () => {
      // Mock 1640 hours (90% of 1822)
      prisma.timeEntry.findMany.mockResolvedValue([
        {
          id: 'entry-1',
          userId,
          tenantId,
          clockIn: new Date('2026-01-01T00:00:00Z'),
          clockOut: addHours(new Date('2026-01-01T00:00:00Z'), 1640),
          breakMinutes: 0,
          status: EntryStatus.ACTIVE,
        },
      ]);

      const result = await service.validateAnnualHours(userId, tenantId, year);

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('ANNUAL_HOURS_WARNING');
    });

    it('should allow clock-in if annual hours are under limit', async () => {
      // Mock 1000 hours
      prisma.timeEntry.findMany.mockResolvedValue([
        {
          id: 'entry-1',
          userId,
          tenantId,
          clockIn: new Date('2026-01-01T00:00:00Z'),
          clockOut: addHours(new Date('2026-01-01T00:00:00Z'), 1000),
          breakMinutes: 0,
          status: EntryStatus.ACTIVE,
        },
      ]);

      const result = await service.validateAnnualHours(userId, tenantId, year);

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('validateWeeklyRest', () => {
    const userId = 'user-1';
    const tenantId = 'tenant-1';

    it('should allow clock-in if 36-hour rest exists in last 7 days', async () => {
      const now = new Date();
      
      // Mock 36-hour rest: entry ends, then 40 hours pass before next entry
      const entries = [
        {
          id: 'entry-1',
          userId,
          tenantId,
          clockIn: subDays(now, 5),
          clockOut: addHours(subDays(now, 5), 8), // ends 5 days ago + 8 hours
          status: EntryStatus.ACTIVE,
        },
        {
          id: 'entry-2',
          userId,
          tenantId,
          clockIn: addHours(subDays(now, 3), 16), // 40-hour gap (5 days ago + 8h to 3 days ago + 16h)
          clockOut: addHours(subDays(now, 3), 24),
          status: EntryStatus.ACTIVE,
        },
      ];

      prisma.timeEntry.findMany.mockResolvedValue(entries);

      const result = await service.validateWeeklyRest(userId, tenantId);

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return metadata even if no entries exist', async () => {
      prisma.timeEntry.findMany.mockResolvedValue([]);

      const result = await service.validateWeeklyRest(userId, tenantId);

      expect(result.isCompliant).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata).toHaveProperty('maxRestHours7');
      expect(result.metadata).toHaveProperty('maxRestHours14');
    });
  });

  describe('validateBreakCompliance', () => {
    it('should warn if shift > 6 hours without break', async () => {
      const clockIn = new Date('2026-01-29T08:00:00Z');
      const clockOut = new Date('2026-01-29T15:00:00Z'); // 7 hours
      const timeEntry: any = {
        id: 'entry-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        clockIn,
        clockOut,
        breakMinutes: 0, // No break
        status: EntryStatus.ACTIVE,
      };

      const result = await service.validateBreakCompliance(timeEntry);

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('BREAK_REQUIRED');
    });

    it('should not warn if shift > 6 hours with adequate break', async () => {
      const clockIn = new Date('2026-01-29T08:00:00Z');
      const clockOut = new Date('2026-01-29T15:00:00Z'); // 7 hours
      const timeEntry: any = {
        id: 'entry-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        clockIn,
        clockOut,
        breakMinutes: 15, // Adequate break
        status: EntryStatus.ACTIVE,
      };

      const result = await service.validateBreakCompliance(timeEntry);

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should not warn if shift <= 6 hours without break', async () => {
      const clockIn = new Date('2026-01-29T08:00:00Z');
      const clockOut = new Date('2026-01-29T14:00:00Z'); // 6 hours
      const timeEntry: any = {
        id: 'entry-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        clockIn,
        clockOut,
        breakMinutes: 0,
        status: EntryStatus.ACTIVE,
      };

      const result = await service.validateBreakCompliance(timeEntry);

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle ongoing shift (no clockOut)', async () => {
      const clockIn = new Date('2026-01-29T08:00:00Z');
      const timeEntry: any = {
        id: 'entry-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        clockIn,
        clockOut: null,
        breakMinutes: 0,
        status: EntryStatus.ACTIVE,
      };

      const result = await service.validateBreakCompliance(timeEntry);

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('validateClockInAllowed', () => {
    const userId = 'user-1';
    const tenantId = 'tenant-1';

    it('should aggregate all validation checks', async () => {
      // Mock rest period violation
      prisma.timeEntry.findFirst.mockResolvedValue({
        id: 'entry-1',
        userId,
        tenantId,
        clockIn: subHours(new Date(), 12),
        clockOut: subHours(new Date(), 2), // Only 2 hours rest
        status: EntryStatus.ACTIVE,
      });

      prisma.timeEntry.findMany.mockResolvedValue([]);

      const result = await service.validateClockInAllowed(userId, tenantId);

      expect(result.isCompliant).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(tenantsService.getTenant).toHaveBeenCalledWith(tenantId);
    });

    it('should allow clock-in if all checks pass', async () => {
      // Mock passing all checks
      prisma.timeEntry.findFirst.mockResolvedValue({
        id: 'entry-1',
        userId,
        tenantId,
        clockIn: subHours(new Date(), 24),
        clockOut: subHours(new Date(), 13), // 13 hours rest
        status: EntryStatus.ACTIVE,
      });

      prisma.timeEntry.findMany.mockResolvedValue([]);

      const result = await service.validateClockInAllowed(userId, tenantId);

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });
});
