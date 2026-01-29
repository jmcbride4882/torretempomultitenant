import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get tenant information by ID
   * @param tenantId - Tenant UUID
   * @returns Tenant object without sensitive fields
   */
  async getTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        timezone: true,
        locale: true,
        convenioCode: true,
        maxWeeklyHours: true,
        maxAnnualHours: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant not found`);
    }

    return tenant;
  }

  /**
   * Update tenant settings
   * Only ADMIN users can update tenant settings
   * @param tenantId - Tenant UUID
   * @param userId - User UUID (for audit)
   * @param userEmail - User email (for audit)
   * @param userRole - User role (for audit)
   * @param dto - Update data
   * @returns Updated tenant
   */
  async updateTenant(
    tenantId: string,
    userId: string,
    userEmail: string,
    userRole: string,
    dto: UpdateTenantDto,
  ) {
    // Check if tenant exists
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!existingTenant) {
      throw new NotFoundException(`Tenant not found`);
    }

    // Validate timezone if provided (basic validation)
    if (dto.timezone) {
      try {
        // Try to format a date with the timezone to validate it
        new Intl.DateTimeFormat('en-US', { timeZone: dto.timezone });
      } catch {
        throw new BadRequestException(
          `Invalid timezone: ${dto.timezone}. Must be a valid IANA timezone.`,
        );
      }
    }

    // Store before state for audit
    const beforeState = {
      name: existingTenant.name,
      timezone: existingTenant.timezone,
      locale: existingTenant.locale,
      convenioCode: existingTenant.convenioCode,
      maxWeeklyHours: existingTenant.maxWeeklyHours,
      maxAnnualHours: existingTenant.maxAnnualHours,
    };

    // Update tenant
    const updatedTenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.timezone && { timezone: dto.timezone }),
        ...(dto.locale && { locale: dto.locale }),
        ...(dto.convenioCode !== undefined && {
          convenioCode: dto.convenioCode,
        }),
        ...(dto.maxWeeklyHours && { maxWeeklyHours: dto.maxWeeklyHours }),
        ...(dto.maxAnnualHours && { maxAnnualHours: dto.maxAnnualHours }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        timezone: true,
        locale: true,
        convenioCode: true,
        maxWeeklyHours: true,
        maxAnnualHours: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Tenant ${tenantId} updated by ${userEmail}`);

    // Create audit log
    await this.auditService.createLog({
      tenantId,
      action: 'TENANT_UPDATED',
      entity: 'Tenant',
      entityId: tenantId,
      actorId: userId,
      actorEmail: userEmail,
      actorRole: userRole,
      changes: {
        before: beforeState,
        after: {
          name: updatedTenant.name,
          timezone: updatedTenant.timezone,
          locale: updatedTenant.locale,
          convenioCode: updatedTenant.convenioCode,
          maxWeeklyHours: updatedTenant.maxWeeklyHours,
          maxAnnualHours: updatedTenant.maxAnnualHours,
        },
      },
    });

    return updatedTenant;
  }

  /**
   * Get tenant statistics
   * @param tenantId - Tenant UUID
   * @returns Statistics object with counts
   */
  async getTenantStats(tenantId: string) {
    // Check if tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant not found`);
    }

    // Get counts in parallel
    const [totalUsers, activeUsers, totalLocations, activeLocations] =
      await Promise.all([
        this.prisma.user.count({
          where: { tenantId },
        }),
        this.prisma.user.count({
          where: {
            tenantId,
            isActive: true,
          },
        }),
        this.prisma.location.count({
          where: { tenantId },
        }),
        this.prisma.location.count({
          where: {
            tenantId,
            isActive: true,
          },
        }),
      ]);

    this.logger.log(`Stats retrieved for tenant ${tenantId}`);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      totalLocations,
      activeLocations,
      inactiveLocations: totalLocations - activeLocations,
    };
  }
}
