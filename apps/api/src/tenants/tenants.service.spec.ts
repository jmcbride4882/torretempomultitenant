/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any, @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { mockPrismaService, resetPrismaMocks } from '../test-utils/prisma-mock';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('TenantsService', () => {
  let service: TenantsService;
  let prisma: typeof mockPrismaService;
  let auditService: AuditService;

  const mockTenant = {
    id: 'tenant-1',
    name: 'Test Company',
    slug: 'test-company',
    timezone: 'Europe/Madrid',
    locale: 'es',
    convenioCode: null,
    maxWeeklyHours: 40,
    maxAnnualHours: 1822,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-15T00:00:00Z'),
  };

  const mockUser = {
    id: 'user-1',
    email: 'admin@test.com',
    role: 'ADMIN',
  };

  beforeEach(async () => {
    resetPrismaMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditService,
          useValue: {
            createLog: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
    prisma = module.get(PrismaService);
    auditService = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTenant', () => {
    it('should return tenant by ID', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);

      const result = await service.getTenant('tenant-1');

      expect(result).toEqual(mockTenant);
      expect(prisma.tenant.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tenant-1' },
        }),
      );
    });

    it('should throw NotFoundException if tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.getTenant('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.getTenant('nonexistent')).rejects.toThrow('Tenant not found');
    });
  });

  describe('updateTenant', () => {
    it('should update tenant settings', async () => {
      const dto = {
        name: 'Updated Company Name',
        maxWeeklyHours: 45,
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.tenant.update.mockResolvedValue({
        ...mockTenant,
        ...dto,
      });

      const result = await service.updateTenant(
        'tenant-1',
        mockUser.id,
        mockUser.email,
        mockUser.role,
        dto,
      );

      expect(result.name).toBe(dto.name);
      expect(result.maxWeeklyHours).toBe(dto.maxWeeklyHours);
      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tenant-1' },
          data: expect.objectContaining(dto),
        }),
      );
      expect(auditService.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TENANT_UPDATED',
          entity: 'Tenant',
        }),
      );
    });

    it('should throw NotFoundException if tenant not found', async () => {
      const dto = { name: 'New Name' };

      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTenant('nonexistent', mockUser.id, mockUser.email, mockUser.role, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate timezone format', async () => {
      const dto = {
        timezone: 'Invalid/Timezone',
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenant);

      await expect(
        service.updateTenant('tenant-1', mockUser.id, mockUser.email, mockUser.role, dto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateTenant('tenant-1', mockUser.id, mockUser.email, mockUser.role, dto),
      ).rejects.toThrow('Invalid timezone');
    });

    it('should accept valid timezone', async () => {
      const dto = {
        timezone: 'America/New_York',
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.tenant.update.mockResolvedValue({
        ...mockTenant,
        timezone: dto.timezone,
      });

      const result = await service.updateTenant(
        'tenant-1',
        mockUser.id,
        mockUser.email,
        mockUser.role,
        dto,
      );

      expect(result.timezone).toBe(dto.timezone);
    });

    it('should store before and after state in audit log', async () => {
      const dto = {
        maxWeeklyHours: 45,
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.tenant.update.mockResolvedValue({
        ...mockTenant,
        maxWeeklyHours: dto.maxWeeklyHours,
      });

      await service.updateTenant(
        'tenant-1',
        mockUser.id,
        mockUser.email,
        mockUser.role,
        dto,
      );

      expect(auditService.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: expect.objectContaining({
            before: expect.objectContaining({
              maxWeeklyHours: mockTenant.maxWeeklyHours,
            }),
            after: expect.objectContaining({
              maxWeeklyHours: dto.maxWeeklyHours,
            }),
          }),
        }),
      );
    });
  });

  describe('getTenantStats', () => {
    it('should return tenant statistics', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.user.count
        .mockResolvedValueOnce(10) // totalUsers
        .mockResolvedValueOnce(8); // activeUsers
      prisma.location.count
        .mockResolvedValueOnce(5) // totalLocations
        .mockResolvedValueOnce(4); // activeLocations

      const result = await service.getTenantStats('tenant-1');

      expect(result).toEqual({
        totalUsers: 10,
        activeUsers: 8,
        inactiveUsers: 2,
        totalLocations: 5,
        activeLocations: 4,
        inactiveLocations: 1,
      });
    });

    it('should throw NotFoundException if tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.getTenantStats('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listAllTenants', () => {
    it('should return paginated list of tenants', async () => {
      const tenants = [
        { ...mockTenant, _count: { users: 10, locations: 5 } },
        {
          id: 'tenant-2',
          name: 'Another Company',
          slug: 'another-company',
          timezone: 'Europe/London',
          locale: 'en',
          convenioCode: null,
          maxWeeklyHours: 40,
          maxAnnualHours: 1822,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { users: 5, locations: 2 },
        },
      ];

      prisma.tenant.findMany.mockResolvedValue(tenants);
      prisma.tenant.count.mockResolvedValue(2);

      const result = await service.listAllTenants(1, 50);

      expect(result).toEqual({
        tenants,
        total: 2,
        page: 1,
        pageSize: 50,
      });
      expect(prisma.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 50,
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      prisma.tenant.findMany.mockResolvedValue([]);
      prisma.tenant.count.mockResolvedValue(100);

      await service.listAllTenants(3, 20);

      expect(prisma.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40, // (page 3 - 1) * pageSize 20
          take: 20,
        }),
      );
    });

    it('should filter by search query', async () => {
      prisma.tenant.findMany.mockResolvedValue([mockTenant]);
      prisma.tenant.count.mockResolvedValue(1);

      await service.listAllTenants(1, 50, 'test');

      expect(prisma.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'test', mode: 'insensitive' } },
              { slug: { contains: 'test', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });
  });

  describe('getTenantById', () => {
    it('should return tenant with stats', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.user.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(8);
      prisma.location.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(4);

      const result = await service.getTenantById('tenant-1');

      expect(result).toHaveProperty('id', 'tenant-1');
      expect(result).toHaveProperty('stats');
      expect(result.stats).toEqual({
        totalUsers: 10,
        activeUsers: 8,
        inactiveUsers: 2,
        totalLocations: 5,
        activeLocations: 4,
        inactiveLocations: 1,
      });
    });

    it('should throw NotFoundException if tenant not found', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.getTenantById('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.getTenantById('nonexistent')).rejects.toThrow(
        'Tenant with ID nonexistent not found',
      );
    });
  });

  describe('createTenant', () => {
    it('should create tenant with admin user', async () => {
      const dto = {
        companyName: 'New Company',
        adminEmail: 'admin@newcompany.com',
        adminPassword: 'securepassword',
        adminFirstName: 'Admin',
        adminLastName: 'User',
      };

      const actorId = 'global-admin-1';
      const actorEmail = 'global@admin.com';

      prisma.tenant.findUnique.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      const createdTenant = {
        id: 'tenant-3',
        name: dto.companyName,
        slug: 'new-company',
        timezone: 'Europe/Madrid',
        locale: 'es',
        convenioCode: null,
        maxWeeklyHours: 40,
        maxAnnualHours: 1822,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const createdUser = {
        id: 'user-3',
        tenantId: createdTenant.id,
        email: dto.adminEmail.toLowerCase(),
        firstName: dto.adminFirstName,
        lastName: dto.adminLastName,
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date(),
      };

      prisma.$transaction.mockImplementation((callback: any) => {
        return callback({
          tenant: {
            create: jest.fn().mockResolvedValue(createdTenant),
          },
          user: {
            create: jest.fn().mockResolvedValue(createdUser),
          },
        });
      });

      const result = await service.createTenant(dto, actorId, actorEmail);

      expect(result).toHaveProperty('tenant');
      expect(result).toHaveProperty('adminUser');
      expect(result.tenant.name).toBe(dto.companyName);
      expect(result.adminUser.email).toBe(dto.adminEmail.toLowerCase());
      expect(auditService.createLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TENANT_CREATED',
          entity: 'Tenant',
        }),
      );
    });

    it('should throw ConflictException if slug already exists', async () => {
      const dto = {
        companyName: 'Test Company',
        adminEmail: 'admin@test.com',
        adminPassword: 'password',
        adminFirstName: 'Admin',
        adminLastName: 'User',
      };

      prisma.tenant.findUnique.mockResolvedValue(mockTenant);

      await expect(service.createTenant(dto, 'actor-1', 'actor@test.com')).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createTenant(dto, 'actor-1', 'actor@test.com')).rejects.toThrow(
        'Company name already taken',
      );
    });

    it('should throw ConflictException if admin email already exists', async () => {
      const dto = {
        companyName: 'New Company',
        adminEmail: 'existing@test.com',
        adminPassword: 'password',
        adminFirstName: 'Admin',
        adminLastName: 'User',
      };

      prisma.tenant.findUnique.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue({
        id: 'existing-user',
        email: dto.adminEmail,
      });

      await expect(service.createTenant(dto, 'actor-1', 'actor@test.com')).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createTenant(dto, 'actor-1', 'actor@test.com')).rejects.toThrow(
        'Admin email already registered',
      );
    });

    it('should use default values if not provided', async () => {
      const dto = {
        companyName: 'New Company',
        adminEmail: 'admin@newcompany.com',
        adminPassword: 'password',
        adminFirstName: 'Admin',
        adminLastName: 'User',
      };

      prisma.tenant.findUnique.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      const createdTenant = {
        id: 'tenant-4',
        name: dto.companyName,
        slug: 'new-company',
        timezone: 'Europe/Madrid', // Default
        locale: 'es', // Default
        convenioCode: null,
        maxWeeklyHours: 40, // Default
        maxAnnualHours: 1822, // Default
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const createdUser = {
        id: 'user-4',
        tenantId: createdTenant.id,
        email: dto.adminEmail.toLowerCase(),
        firstName: dto.adminFirstName,
        lastName: dto.adminLastName,
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date(),
      };

      prisma.$transaction.mockImplementation((callback: any) => {
        return callback({
          tenant: {
            create: jest.fn().mockResolvedValue(createdTenant),
          },
          user: {
            create: jest.fn().mockResolvedValue(createdUser),
          },
        });
      });

      const result = await service.createTenant(dto, 'actor-1', 'actor@test.com');

      expect(result.tenant.timezone).toBe('Europe/Madrid');
      expect(result.tenant.locale).toBe('es');
      expect(result.tenant.maxWeeklyHours).toBe(40);
      expect(result.tenant.maxAnnualHours).toBe(1822);
    });

    it('should use provided values if given', async () => {
      const dto = {
        companyName: 'New Company',
        adminEmail: 'admin@newcompany.com',
        adminPassword: 'password',
        adminFirstName: 'Admin',
        adminLastName: 'User',
        timezone: 'America/New_York',
        locale: 'en',
        convenioCode: '12345',
        maxWeeklyHours: 35,
        maxAnnualHours: 1600,
      };

      prisma.tenant.findUnique.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      const createdTenant = {
        id: 'tenant-5',
        name: dto.companyName,
        slug: 'new-company',
        timezone: dto.timezone,
        locale: dto.locale,
        convenioCode: dto.convenioCode,
        maxWeeklyHours: dto.maxWeeklyHours,
        maxAnnualHours: dto.maxAnnualHours,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const createdUser = {
        id: 'user-5',
        tenantId: createdTenant.id,
        email: dto.adminEmail.toLowerCase(),
        firstName: dto.adminFirstName,
        lastName: dto.adminLastName,
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date(),
      };

      prisma.$transaction.mockImplementation((callback: any) => {
        return callback({
          tenant: {
            create: jest.fn().mockResolvedValue(createdTenant),
          },
          user: {
            create: jest.fn().mockResolvedValue(createdUser),
          },
        });
      });

      const result = await service.createTenant(dto, 'actor-1', 'actor@test.com');

      expect(result.tenant.timezone).toBe(dto.timezone);
      expect(result.tenant.locale).toBe(dto.locale);
      expect(result.tenant.convenioCode).toBe(dto.convenioCode);
      expect(result.tenant.maxWeeklyHours).toBe(dto.maxWeeklyHours);
      expect(result.tenant.maxAnnualHours).toBe(dto.maxAnnualHours);
    });
  });
});
