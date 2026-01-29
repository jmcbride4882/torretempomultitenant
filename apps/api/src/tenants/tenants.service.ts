import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import * as bcrypt from 'bcrypt';

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

   /**
    * List all tenants (GLOBAL_ADMIN only)
    * @param page - Page number (default: 1)
    * @param pageSize - Items per page (default: 50)
    * @param search - Optional search query for name or slug
    * @returns Paginated response with tenants array and metadata
    */
   async listAllTenants(page: number = 1, pageSize: number = 50, search?: string) {
     const skip = (page - 1) * pageSize;

     const where = search
       ? {
           OR: [
             { name: { contains: search, mode: 'insensitive' as any } },
             { slug: { contains: search, mode: 'insensitive' as any } },
           ],
         }
       : {};

     const [tenants, total] = await Promise.all([
       this.prisma.tenant.findMany({
         where,
         skip,
         take: pageSize,
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
           _count: {
             select: {
               users: true,
               locations: true,
             },
           },
         },
         orderBy: { createdAt: 'desc' },
       }),
       this.prisma.tenant.count({ where }),
     ]);

     this.logger.log(
       `Listed tenants: page ${page}, pageSize ${pageSize}, total ${total}`,
     );

     return {
       tenants,
       total,
       page,
       pageSize,
     };
   }

  /**
   * Get tenant by ID (GLOBAL_ADMIN only)
   * @param id - Tenant UUID
   * @returns Tenant object with detailed stats
   */
  async getTenantById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
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
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    // Get stats for this tenant
    const stats = await this.getTenantStats(id);

    return {
      ...tenant,
      stats,
    };
  }

  /**
   * Create a new tenant with admin user (GLOBAL_ADMIN only)
   * @param dto - Create tenant data
   * @param actorId - User creating the tenant
   * @param actorEmail - Email of user creating the tenant
   * @returns Created tenant and admin user
   */
  async createTenant(
    dto: CreateTenantDto,
    actorId: string,
    actorEmail: string,
  ) {
    // Generate slug from company name
    const slug = this.generateSlug(dto.companyName);

    // Check if slug already exists
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (existingTenant) {
      throw new ConflictException(
        'Company name already taken, please choose another',
      );
    }

    // Check if admin email already exists
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.adminEmail.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Admin email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.adminPassword, 12);

    // Create tenant and admin user in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: dto.companyName,
          slug,
          timezone: dto.timezone || 'Europe/Madrid',
          locale: dto.locale || 'es',
          convenioCode: dto.convenioCode || null,
          maxWeeklyHours: dto.maxWeeklyHours || 40,
          maxAnnualHours: dto.maxAnnualHours || 1822,
        },
      });

      // Create admin user
      const adminUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.adminEmail.toLowerCase(),
          passwordHash,
          firstName: dto.adminFirstName,
          lastName: dto.adminLastName,
          role: 'ADMIN',
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      return { tenant, adminUser };
    });

    this.logger.log(
      `Tenant ${result.tenant.name} created by ${actorEmail} with admin ${result.adminUser.email}`,
    );

    // Create audit log
    await this.auditService.createLog({
      tenantId: result.tenant.id,
      action: 'TENANT_CREATED',
      entity: 'Tenant',
      entityId: result.tenant.id,
      actorId,
      actorEmail,
      actorRole: 'GLOBAL_ADMIN',
      changes: {
        tenant: result.tenant,
        adminUser: {
          email: result.adminUser.email,
          firstName: result.adminUser.firstName,
          lastName: result.adminUser.lastName,
        },
      },
    });

    return result;
  }

  /**
   * Generate URL-safe slug from company name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .substring(0, 50); // Limit length
  }
}
