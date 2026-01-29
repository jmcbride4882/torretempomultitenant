import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { EntryStatus, TimeEntry } from '@prisma/client';
import { addDays, addHours, differenceInMinutes } from 'date-fns';
import {
  ComplianceCheckResult,
  ComplianceViolation,
  ComplianceWarning,
} from './types/compliance.types';

const MINUTES_IN_HOUR = 60;
const REST_PERIOD_HOURS = 12;
const DAILY_LIMIT_HOURS = 9;
const DAILY_WARNING_HOURS = 8;
const WEEKLY_REST_HOURS = 36;
const BREAK_REQUIRED_AFTER_HOURS = 6;
const BREAK_MINUTES_REQUIRED = 15;

type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantsService: TenantsService,
  ) {}

  async validateRestPeriod(
    userId: string,
    tenantId: string,
  ): Promise<ComplianceCheckResult> {
    const now = new Date();
    const lastEntry = await this.prisma.timeEntry.findFirst({
      where: {
        userId,
        tenantId,
        status: { not: EntryStatus.DELETED },
        clockOut: { not: null },
      },
      orderBy: {
        clockOut: 'desc',
      },
    });

    if (!lastEntry?.clockOut) {
      return this.buildResult([], [], {
        checkedAt: now.toISOString(),
      });
    }

    const minutesSince = differenceInMinutes(now, lastEntry.clockOut);
    const requiredMinutes = REST_PERIOD_HOURS * MINUTES_IN_HOUR;
    const nextAllowedClockIn = addHours(lastEntry.clockOut, REST_PERIOD_HOURS);

    if (minutesSince < requiredMinutes) {
      const violation: ComplianceViolation = {
        code: 'REST_PERIOD_INSUFFICIENT',
        message: this.formatMessage(
          'No se cumple el descanso minimo de 12 horas entre turnos.',
          'Minimum 12-hour rest period not met between shifts.',
        ),
        severity: 'BLOCKING',
        details: {
          lastClockOut: lastEntry.clockOut.toISOString(),
          minutesSinceLastClockOut: minutesSince,
          requiredMinutes,
          nextAllowedClockIn: nextAllowedClockIn.toISOString(),
        },
      };

      this.logger.warn(
        `Rest period violation for user ${userId} in tenant ${tenantId}`,
      );

      return this.buildResult([violation], [], {
        nextAllowedClockIn: nextAllowedClockIn.toISOString(),
      });
    }

    return this.buildResult([], [], {
      lastClockOut: lastEntry.clockOut.toISOString(),
      minutesSinceLastClockOut: minutesSince,
      nextAllowedClockIn: nextAllowedClockIn.toISOString(),
    });
  }

  async validateDailyHours(
    userId: string,
    tenantId: string,
    date: Date,
  ): Promise<ComplianceCheckResult> {
    const tenant = await this.tenantsService.getTenant(tenantId);
    return this.validateDailyHoursWithTenant(userId, tenantId, tenant.timezone, date);
  }

  async validateWeeklyHours(
    userId: string,
    tenantId: string,
    weekStart: Date,
  ): Promise<ComplianceCheckResult> {
    const tenant = await this.tenantsService.getTenant(tenantId);
    return this.validateWeeklyHoursWithTenant(
      userId,
      tenantId,
      tenant.timezone,
      tenant.maxWeeklyHours,
      weekStart,
    );
  }

  async validateAnnualHours(
    userId: string,
    tenantId: string,
    year: number,
  ): Promise<ComplianceCheckResult> {
    const tenant = await this.tenantsService.getTenant(tenantId);
    return this.validateAnnualHoursWithTenant(
      userId,
      tenantId,
      tenant.timezone,
      tenant.maxAnnualHours,
      year,
    );
  }

  async validateWeeklyRest(
    userId: string,
    tenantId: string,
  ): Promise<ComplianceCheckResult> {
    const tenant = await this.tenantsService.getTenant(tenantId);
    return this.validateWeeklyRestWithTenant(userId, tenantId, tenant.timezone);
  }

  async validateBreakCompliance(
    timeEntry: TimeEntry,
  ): Promise<ComplianceCheckResult> {
    const now = new Date();
    const clockOut = timeEntry.clockOut ?? now;
    const totalMinutes = differenceInMinutes(clockOut, timeEntry.clockIn);
    const breakMinutes = timeEntry.breakMinutes ?? 0;
    const warnings: ComplianceWarning[] = [];

    if (totalMinutes <= 0) {
      return this.buildResult([], [], {
        clockIn: timeEntry.clockIn.toISOString(),
        clockOut: clockOut.toISOString(),
      });
    }

    const totalHours = totalMinutes / MINUTES_IN_HOUR;
    if (totalHours > BREAK_REQUIRED_AFTER_HOURS) {
      if (breakMinutes < BREAK_MINUTES_REQUIRED) {
        warnings.push({
          code: 'BREAK_REQUIRED',
          message: this.formatMessage(
            'Turno superior a 6 horas sin descanso registrado.',
            'Shift longer than 6 hours without recorded break.',
          ),
          threshold: BREAK_MINUTES_REQUIRED,
          current: breakMinutes,
        });

        this.logger.warn(
          `Break compliance warning for entry ${timeEntry.id}`,
        );
      }
    }

    return this.buildResult([], warnings, {
      totalMinutes,
      breakMinutes,
      clockIn: timeEntry.clockIn.toISOString(),
      clockOut: clockOut.toISOString(),
    });
  }

  async validateClockInAllowed(
    userId: string,
    tenantId: string,
  ): Promise<ComplianceCheckResult> {
    const tenant = await this.tenantsService.getTenant(tenantId);
    const now = new Date();
    const weekStart = this.getZonedStartOfWeek(now, tenant.timezone);
    const currentYear = this.getZonedDateParts(now, tenant.timezone).year;

    const [restPeriod, dailyHours, weeklyHours, annualHours, weeklyRest] =
      await Promise.all([
        this.validateRestPeriod(userId, tenantId),
        this.validateDailyHoursWithTenant(userId, tenantId, tenant.timezone, now),
        this.validateWeeklyHoursWithTenant(
          userId,
          tenantId,
          tenant.timezone,
          tenant.maxWeeklyHours,
          weekStart,
        ),
        this.validateAnnualHoursWithTenant(
          userId,
          tenantId,
          tenant.timezone,
          tenant.maxAnnualHours,
          currentYear,
        ),
        this.validateWeeklyRestWithTenant(userId, tenantId, tenant.timezone),
      ]);

    const violations = [
      ...restPeriod.violations,
      ...dailyHours.violations,
      ...weeklyHours.violations,
      ...annualHours.violations,
      ...weeklyRest.violations,
    ];

    const warnings = [
      ...restPeriod.warnings,
      ...dailyHours.warnings,
      ...weeklyHours.warnings,
      ...annualHours.warnings,
      ...weeklyRest.warnings,
    ];

    if (violations.length > 0) {
      this.logger.warn(
        `Clock-in blocked by compliance for user ${userId} in tenant ${tenantId}`,
      );
    } else if (warnings.length > 0) {
      this.logger.warn(
        `Clock-in warnings for user ${userId} in tenant ${tenantId}`,
      );
    }

    return this.buildResult(violations, warnings, {
      checkedAt: now.toISOString(),
      timezone: tenant.timezone,
      nextAllowedClockIn: restPeriod.metadata?.nextAllowedClockIn,
    });
  }

  private async validateDailyHoursWithTenant(
    userId: string,
    tenantId: string,
    timeZone: string,
    date: Date,
  ): Promise<ComplianceCheckResult> {
    const range = this.getZonedDayRange(date, timeZone);
    const now = new Date();
    const entries = await this.getEntriesForRange(
      userId,
      tenantId,
      range.start,
      range.end,
    );

    const workedMinutes = this.calculateWorkedMinutes(
      entries,
      range.start,
      range.end,
      now,
    );
    const workedHours = workedMinutes / MINUTES_IN_HOUR;

    const violations: ComplianceViolation[] = [];
    const warnings: ComplianceWarning[] = [];

    if (workedHours >= DAILY_LIMIT_HOURS) {
      violations.push({
        code: 'DAILY_HOURS_LIMIT_REACHED',
        message: this.formatMessage(
          'Se ha superado el limite diario de 9 horas.',
          'Daily limit of 9 hours exceeded.',
        ),
        severity: 'BLOCKING',
        details: {
          workedHours: this.roundHours(workedHours),
          limitHours: DAILY_LIMIT_HOURS,
          rangeStart: range.start.toISOString(),
          rangeEnd: range.end.toISOString(),
        },
      });

      this.logger.warn(
        `Daily hours violation for user ${userId} in tenant ${tenantId}`,
      );
    } else if (workedHours >= DAILY_WARNING_HOURS) {
      warnings.push({
        code: 'DAILY_HOURS_WARNING',
        message: this.formatMessage(
          'Se acerca al limite diario de 9 horas.',
          'Approaching daily limit of 9 hours.',
        ),
        threshold: DAILY_WARNING_HOURS,
        current: this.roundHours(workedHours),
      });

      this.logger.warn(
        `Daily hours warning for user ${userId} in tenant ${tenantId}`,
      );
    }

    return this.buildResult(violations, warnings, {
      workedMinutes: Math.max(0, Math.round(workedMinutes)),
      workedHours: this.roundHours(workedHours),
      limitHours: DAILY_LIMIT_HOURS,
      warningHours: DAILY_WARNING_HOURS,
      rangeStart: range.start.toISOString(),
      rangeEnd: range.end.toISOString(),
      timezone: timeZone,
    });
  }

  private async validateWeeklyHoursWithTenant(
    userId: string,
    tenantId: string,
    timeZone: string,
    maxWeeklyHours: number,
    weekStart: Date,
  ): Promise<ComplianceCheckResult> {
    const start = this.getZonedStartOfDay(weekStart, timeZone);
    const end = this.getZonedStartOfDay(
      this.addZonedDays(weekStart, timeZone, 7),
      timeZone,
    );
    const now = new Date();

    const entries = await this.getEntriesForRange(userId, tenantId, start, end);
    const workedMinutes = this.calculateWorkedMinutes(
      entries,
      start,
      end,
      now,
    );
    const workedHours = workedMinutes / MINUTES_IN_HOUR;

    const weeklyLimit = maxWeeklyHours ?? 40;
    const weeklyWarning = weeklyLimit * 0.9;

    const violations: ComplianceViolation[] = [];
    const warnings: ComplianceWarning[] = [];

    if (workedHours >= weeklyLimit) {
      violations.push({
        code: 'WEEKLY_HOURS_LIMIT_REACHED',
        message: this.formatMessage(
          'Se ha superado el limite semanal de horas.',
          'Weekly hours limit exceeded.',
        ),
        severity: 'BLOCKING',
        details: {
          workedHours: this.roundHours(workedHours),
          limitHours: weeklyLimit,
          rangeStart: start.toISOString(),
          rangeEnd: end.toISOString(),
        },
      });

      this.logger.warn(
        `Weekly hours violation for user ${userId} in tenant ${tenantId}`,
      );
    } else if (workedHours >= weeklyWarning) {
      warnings.push({
        code: 'WEEKLY_HOURS_WARNING',
        message: this.formatMessage(
          'Se acerca al limite semanal de horas.',
          'Approaching weekly hours limit.',
        ),
        threshold: this.roundHours(weeklyWarning),
        current: this.roundHours(workedHours),
      });

      this.logger.warn(
        `Weekly hours warning for user ${userId} in tenant ${tenantId}`,
      );
    }

    return this.buildResult(violations, warnings, {
      workedMinutes: Math.max(0, Math.round(workedMinutes)),
      workedHours: this.roundHours(workedHours),
      limitHours: weeklyLimit,
      warningHours: this.roundHours(weeklyWarning),
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),
      timezone: timeZone,
    });
  }

  private async validateAnnualHoursWithTenant(
    userId: string,
    tenantId: string,
    timeZone: string,
    maxAnnualHours: number,
    year: number,
  ): Promise<ComplianceCheckResult> {
    const range = this.getZonedYearRange(year, timeZone);
    const now = new Date();
    const entries = await this.getEntriesForRange(
      userId,
      tenantId,
      range.start,
      range.end,
    );

    const workedMinutes = this.calculateWorkedMinutes(
      entries,
      range.start,
      range.end,
      now,
    );
    const workedHours = workedMinutes / MINUTES_IN_HOUR;
    const annualLimit = maxAnnualHours ?? 1822;
    const annualWarning = annualLimit * 0.9;

    const violations: ComplianceViolation[] = [];
    const warnings: ComplianceWarning[] = [];

    if (workedHours >= annualLimit) {
      violations.push({
        code: 'ANNUAL_HOURS_LIMIT_REACHED',
        message: this.formatMessage(
          'Se ha superado el limite anual de horas.',
          'Annual hours limit exceeded.',
        ),
        severity: 'BLOCKING',
        details: {
          workedHours: this.roundHours(workedHours),
          limitHours: annualLimit,
          rangeStart: range.start.toISOString(),
          rangeEnd: range.end.toISOString(),
        },
      });

      this.logger.warn(
        `Annual hours violation for user ${userId} in tenant ${tenantId}`,
      );
    } else if (workedHours >= annualWarning) {
      warnings.push({
        code: 'ANNUAL_HOURS_WARNING',
        message: this.formatMessage(
          'Se acerca al limite anual de horas.',
          'Approaching annual hours limit.',
        ),
        threshold: this.roundHours(annualWarning),
        current: this.roundHours(workedHours),
      });

      this.logger.warn(
        `Annual hours warning for user ${userId} in tenant ${tenantId}`,
      );
    }

    return this.buildResult(violations, warnings, {
      workedMinutes: Math.max(0, Math.round(workedMinutes)),
      workedHours: this.roundHours(workedHours),
      limitHours: annualLimit,
      warningHours: this.roundHours(annualWarning),
      rangeStart: range.start.toISOString(),
      rangeEnd: range.end.toISOString(),
      timezone: timeZone,
    });
  }

  private async validateWeeklyRestWithTenant(
    userId: string,
    tenantId: string,
    timeZone: string,
  ): Promise<ComplianceCheckResult> {
    const now = new Date();
    const start7 = this.getZonedStartOfDay(
      this.addZonedDays(now, timeZone, -6),
      timeZone,
    );
    const start14 = this.getZonedStartOfDay(
      this.addZonedDays(now, timeZone, -13),
      timeZone,
    );

    const entries = await this.getEntriesForRange(
      userId,
      tenantId,
      start14,
      now,
    );

    const maxRestMinutes7 = this.calculateLongestRestMinutes(
      entries,
      start7,
      now,
    );
    const maxRestMinutes14 = this.calculateLongestRestMinutes(
      entries,
      start14,
      now,
    );

    const maxRestHours7 = maxRestMinutes7 / MINUTES_IN_HOUR;
    const maxRestHours14 = maxRestMinutes14 / MINUTES_IN_HOUR;

    const violations: ComplianceViolation[] = [];
    const warnings: ComplianceWarning[] = [];

    if (maxRestHours7 >= WEEKLY_REST_HOURS) {
      return this.buildResult([], [], {
        maxRestHours7: this.roundHours(maxRestHours7),
        maxRestHours14: this.roundHours(maxRestHours14),
        thresholdHours: WEEKLY_REST_HOURS,
        rangeStart7: start7.toISOString(),
        rangeStart14: start14.toISOString(),
        checkedAt: now.toISOString(),
        timezone: timeZone,
      });
    }

    if (maxRestHours14 >= WEEKLY_REST_HOURS) {
      warnings.push({
        code: 'WEEKLY_REST_PENDING',
        message: this.formatMessage(
          'No se ha registrado un descanso continuo de 36 horas en los ultimos 7 dias.',
          'No 36-hour continuous rest recorded in the last 7 days.',
        ),
        threshold: WEEKLY_REST_HOURS,
        current: this.roundHours(maxRestHours7),
      });

      this.logger.warn(
        `Weekly rest warning for user ${userId} in tenant ${tenantId}`,
      );
    } else {
      violations.push({
        code: 'WEEKLY_REST_MISSING',
        message: this.formatMessage(
          'No se ha registrado un descanso continuo de 36 horas en los ultimos 14 dias.',
          'No 36-hour continuous rest recorded in the last 14 days.',
        ),
        severity: 'BLOCKING',
        details: {
          maxRestHours14: this.roundHours(maxRestHours14),
          requiredHours: WEEKLY_REST_HOURS,
          rangeStart14: start14.toISOString(),
          checkedAt: now.toISOString(),
        },
      });

      this.logger.warn(
        `Weekly rest violation for user ${userId} in tenant ${tenantId}`,
      );
    }

    return this.buildResult(violations, warnings, {
      maxRestHours7: this.roundHours(maxRestHours7),
      maxRestHours14: this.roundHours(maxRestHours14),
      thresholdHours: WEEKLY_REST_HOURS,
      rangeStart7: start7.toISOString(),
      rangeStart14: start14.toISOString(),
      checkedAt: now.toISOString(),
      timezone: timeZone,
    });
  }

  private async getEntriesForRange(
    userId: string,
    tenantId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<TimeEntry[]> {
    return this.prisma.timeEntry.findMany({
      where: {
        userId,
        tenantId,
        status: { not: EntryStatus.DELETED },
        clockIn: { lt: rangeEnd },
        OR: [{ clockOut: { gt: rangeStart } }, { clockOut: null }],
      },
      orderBy: {
        clockIn: 'asc',
      },
    });
  }

  private calculateWorkedMinutes(
    entries: TimeEntry[],
    rangeStart: Date,
    rangeEnd: Date,
    now: Date,
  ): number {
    let totalMinutes = 0;

    for (const entry of entries) {
      const entryEnd = entry.clockOut ?? now;
      const overlapMinutes = this.calculateOverlapMinutes(
        entry.clockIn,
        entryEnd,
        rangeStart,
        rangeEnd,
      );

      if (overlapMinutes <= 0) {
        continue;
      }

      const totalEntryMinutes = differenceInMinutes(entryEnd, entry.clockIn);
      const breakMinutes = entry.breakMinutes ?? 0;

      if (breakMinutes > 0 && totalEntryMinutes > 0) {
        const ratio = overlapMinutes / totalEntryMinutes;
        const allocatedBreak = Math.min(breakMinutes * ratio, overlapMinutes);
        totalMinutes += Math.max(0, overlapMinutes - allocatedBreak);
      } else {
        totalMinutes += overlapMinutes;
      }
    }

    return totalMinutes;
  }

  private calculateOverlapMinutes(
    start: Date,
    end: Date,
    rangeStart: Date,
    rangeEnd: Date,
  ): number {
    const overlapStart = start > rangeStart ? start : rangeStart;
    const overlapEnd = end < rangeEnd ? end : rangeEnd;

    if (overlapEnd <= overlapStart) {
      return 0;
    }

    return differenceInMinutes(overlapEnd, overlapStart);
  }

  private calculateLongestRestMinutes(
    entries: TimeEntry[],
    rangeStart: Date,
    rangeEnd: Date,
  ): number {
    if (rangeEnd <= rangeStart) {
      return 0;
    }

    if (entries.length === 0) {
      return differenceInMinutes(rangeEnd, rangeStart);
    }

    const intervals = entries
      .map((entry) => {
        const start = entry.clockIn < rangeStart ? rangeStart : entry.clockIn;
        const clockOut = entry.clockOut ?? rangeEnd;
        const end = clockOut > rangeEnd ? rangeEnd : clockOut;

        if (end <= start) {
          return null;
        }

        return { start, end };
      })
      .filter((interval): interval is { start: Date; end: Date } => interval !== null)
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    if (intervals.length === 0) {
      return differenceInMinutes(rangeEnd, rangeStart);
    }

    const merged: Array<{ start: Date; end: Date }> = [];
    for (const interval of intervals) {
      const last = merged[merged.length - 1];
      if (!last || interval.start > last.end) {
        merged.push({ ...interval });
      } else if (interval.end > last.end) {
        last.end = interval.end;
      }
    }

    let maxGapMinutes = 0;
    let previousEnd = rangeStart;

    for (const interval of merged) {
      if (interval.start > previousEnd) {
        const gap = differenceInMinutes(interval.start, previousEnd);
        maxGapMinutes = Math.max(maxGapMinutes, gap);
      }

      if (interval.end > previousEnd) {
        previousEnd = interval.end;
      }
    }

    if (rangeEnd > previousEnd) {
      const gap = differenceInMinutes(rangeEnd, previousEnd);
      maxGapMinutes = Math.max(maxGapMinutes, gap);
    }

    return maxGapMinutes;
  }

  private getZonedDayRange(date: Date, timeZone: string) {
    const start = this.getZonedStartOfDay(date, timeZone);
    const nextDate = this.addZonedDays(date, timeZone, 1);
    const end = this.getZonedStartOfDay(nextDate, timeZone);

    return { start, end };
  }

  private getZonedYearRange(year: number, timeZone: string) {
    const start = this.zonedTimeToUtc(
      { year, month: 1, day: 1, hour: 0, minute: 0, second: 0 },
      timeZone,
    );
    const end = this.zonedTimeToUtc(
      { year: year + 1, month: 1, day: 1, hour: 0, minute: 0, second: 0 },
      timeZone,
    );

    return { start, end };
  }

  private getZonedStartOfWeek(date: Date, timeZone: string): Date {
    const weekday = this.getZonedWeekday(date, timeZone);
    const weekStartsOn = 1;
    const daysSinceWeekStart = (weekday - weekStartsOn + 7) % 7;
    const weekStartDate = this.addZonedDays(date, timeZone, -daysSinceWeekStart);

    return this.getZonedStartOfDay(weekStartDate, timeZone);
  }

  private getZonedWeekday(date: Date, timeZone: string): number {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
    });
    const weekday = formatter.format(date);
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };

    return map[weekday] ?? 0;
  }

  private getZonedStartOfDay(date: Date, timeZone: string): Date {
    const parts = this.getZonedDateParts(date, timeZone);
    return this.zonedTimeToUtc(
      {
        year: parts.year,
        month: parts.month,
        day: parts.day,
        hour: 0,
        minute: 0,
        second: 0,
      },
      timeZone,
    );
  }

  private addZonedDays(date: Date, timeZone: string, days: number): Date {
    const parts = this.getZonedDateParts(date, timeZone);
    const midday = this.zonedTimeToUtc(
      {
        year: parts.year,
        month: parts.month,
        day: parts.day,
        hour: 12,
        minute: 0,
        second: 0,
      },
      timeZone,
    );

    return addDays(midday, days);
  }

  private getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const parts = formatter.formatToParts(date);
    const values: Record<string, string> = {};

    for (const part of parts) {
      if (part.type !== 'literal') {
        values[part.type] = part.value;
      }
    }

    return {
      year: Number(values.year),
      month: Number(values.month),
      day: Number(values.day),
      hour: Number(values.hour),
      minute: Number(values.minute),
      second: Number(values.second),
    };
  }

  private zonedTimeToUtc(
    parts: {
      year: number;
      month: number;
      day: number;
      hour?: number;
      minute?: number;
      second?: number;
    },
    timeZone: string,
  ): Date {
    const utcDate = new Date(
      Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour ?? 0,
        parts.minute ?? 0,
        parts.second ?? 0,
      ),
    );
    const offset = this.getTimeZoneOffsetMs(utcDate, timeZone);
    return new Date(utcDate.getTime() - offset);
  }

  private getTimeZoneOffsetMs(date: Date, timeZone: string): number {
    const parts = this.getZonedDateParts(date, timeZone);
    const utcTime = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );

    return utcTime - date.getTime();
  }

  private buildResult(
    violations: ComplianceViolation[],
    warnings: ComplianceWarning[],
    metadata?: Record<string, unknown>,
  ): ComplianceCheckResult {
    return {
      isCompliant: violations.length === 0,
      violations,
      warnings,
      metadata,
    };
  }

  private formatMessage(spanish: string, english: string): string {
    return `ES: ${spanish} EN: ${english}`;
  }

  private roundHours(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
