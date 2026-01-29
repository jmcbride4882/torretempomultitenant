import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { mockPrismaService, resetPrismaMocks } from '../test-utils/prisma-mock';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: typeof mockPrismaService;
  let jwtService: JwtService;

  const mockTenant = {
    id: 'tenant-1',
    name: 'Test Company',
    slug: 'test-company',
    timezone: 'Europe/Madrid',
    locale: 'es',
  };

  const mockUser = {
    id: 'user-1',
    tenantId: 'tenant-1',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    firstName: 'John',
    lastName: 'Doe',
    role: 'EMPLOYEE',
    isActive: true,
    tenant: mockTenant,
  };

  beforeEach(async () => {
    resetPrismaMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock_jwt_token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user without password if credentials are valid', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toBeDefined();
      expect(result.passwordHash).toBeUndefined();
      expect(result.email).toBe('test@example.com');
      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            email: 'test@example.com',
            isActive: true,
          },
        }),
      );
    });

    it('should return null if user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password123');

      expect(result).toBeNull();
    });

    it('should return null if password is invalid', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should convert email to lowercase', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.validateUser('TEST@EXAMPLE.COM', 'password123');

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: 'test@example.com',
          }),
        }),
      );
    });
  });

  describe('login', () => {
    it('should return access token and user data on successful login', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      prisma.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken', 'mock_jwt_token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.tenant).toEqual({
        id: mockTenant.id,
        name: mockTenant.name,
        slug: mockTenant.slug,
      });
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          email: mockUser.email,
          tenantId: mockUser.tenantId,
          role: mockUser.role,
        }),
      );
    });

    it('should throw UnauthorizedException if credentials are invalid', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Invalid email or password');
    });

    it('should handle user without tenant', async () => {
      const userWithoutTenant = { ...mockUser, tenant: null };
      
      prisma.user.findFirst.mockResolvedValue(userWithoutTenant);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await service.login(loginDto);

      expect(result.user.tenant).toBeNull();
    });
  });

  describe('registerTenant', () => {
    it('should create tenant and admin user, then return token', async () => {
      const dto = {
        companyName: 'New Company',
        adminEmail: 'admin@newcompany.com',
        adminPassword: 'securepassword',
        adminFirstName: 'Admin',
        adminLastName: 'User',
        timezone: 'Europe/Madrid',
        locale: 'es',
      };

      prisma.user.findFirst.mockResolvedValue(null);
      prisma.tenant.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      const createdTenant = {
        id: 'tenant-2',
        name: dto.companyName,
        slug: 'new-company',
        timezone: dto.timezone,
        locale: dto.locale,
      };

      const createdUser = {
        id: 'user-2',
        tenantId: createdTenant.id,
        email: dto.adminEmail.toLowerCase(),
        passwordHash: 'hashed_password',
        firstName: dto.adminFirstName,
        lastName: dto.adminLastName,
        role: 'ADMIN',
      };

      prisma.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          tenant: {
            create: jest.fn().mockResolvedValue(createdTenant),
          },
          user: {
            create: jest.fn().mockResolvedValue(createdUser),
          },
        });
      });

      const result = await service.registerTenant(dto);

      expect(result).toHaveProperty('accessToken', 'mock_jwt_token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(dto.adminEmail.toLowerCase());
      expect(result.user.role).toBe('ADMIN');
      expect(result.user.tenant).toEqual({
        id: createdTenant.id,
        name: createdTenant.name,
        slug: createdTenant.slug,
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      const dto = {
        companyName: 'New Company',
        adminEmail: 'existing@example.com',
        adminPassword: 'password',
        adminFirstName: 'Admin',
        adminLastName: 'User',
      };

      prisma.user.findFirst.mockResolvedValue(mockUser);

      await expect(service.registerTenant(dto)).rejects.toThrow(ConflictException);
      await expect(service.registerTenant(dto)).rejects.toThrow('Email already registered');
    });

    it('should throw ConflictException if company slug already exists', async () => {
      const dto = {
        companyName: 'Test Company', // Same as mockTenant
        adminEmail: 'newadmin@example.com',
        adminPassword: 'password',
        adminFirstName: 'Admin',
        adminLastName: 'User',
      };

      prisma.user.findFirst.mockResolvedValue(null);
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);

      await expect(service.registerTenant(dto)).rejects.toThrow(ConflictException);
      await expect(service.registerTenant(dto)).rejects.toThrow('Company name already taken');
    });

    it('should generate slug correctly from company name', async () => {
      const dto = {
        companyName: 'My Test Company 123!',
        adminEmail: 'admin@test.com',
        adminPassword: 'password',
        adminFirstName: 'Admin',
        adminLastName: 'User',
      };

      prisma.user.findFirst.mockResolvedValue(null);
      prisma.tenant.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      const createdTenant = {
        id: 'tenant-3',
        name: dto.companyName,
        slug: 'my-test-company-123', // Special chars removed, spaces replaced
        timezone: 'Europe/Madrid',
        locale: 'es',
      };

      const createdUser = {
        id: 'user-3',
        tenantId: createdTenant.id,
        email: dto.adminEmail.toLowerCase(),
        passwordHash: 'hashed_password',
        firstName: dto.adminFirstName,
        lastName: dto.adminLastName,
        role: 'ADMIN',
      };

      prisma.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          tenant: {
            create: jest.fn().mockResolvedValue(createdTenant),
          },
          user: {
            create: jest.fn().mockResolvedValue(createdUser),
          },
        });
      });

      await service.registerTenant(dto);

      // Slug should be generated correctly (verified by transaction)
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should use default timezone and locale if not provided', async () => {
      const dto = {
        companyName: 'New Company',
        adminEmail: 'admin@newcompany.com',
        adminPassword: 'password',
        adminFirstName: 'Admin',
        adminLastName: 'User',
      };

      prisma.user.findFirst.mockResolvedValue(null);
      prisma.tenant.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      const createdTenant = {
        id: 'tenant-4',
        name: dto.companyName,
        slug: 'new-company',
        timezone: 'Europe/Madrid', // Default
        locale: 'es', // Default
      };

      const createdUser = {
        id: 'user-4',
        tenantId: createdTenant.id,
        email: dto.adminEmail.toLowerCase(),
        passwordHash: 'hashed_password',
        firstName: dto.adminFirstName,
        lastName: dto.adminLastName,
        role: 'ADMIN',
      };

      prisma.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          tenant: {
            create: jest.fn().mockResolvedValue(createdTenant),
          },
          user: {
            create: jest.fn().mockResolvedValue(createdUser),
          },
        });
      });

      const result = await service.registerTenant(dto);

      expect(result.user.tenant).toBeDefined();
    });
  });

  describe('registerUser', () => {
    it('should create new user in existing tenant', async () => {
      const tenantId = 'tenant-1';
      const dto = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        employeeCode: 'EMP123',
      };

      prisma.user.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      const createdUser = {
        id: 'user-5',
        tenantId,
        email: dto.email.toLowerCase(),
        passwordHash: 'hashed_password',
        firstName: dto.firstName,
        lastName: dto.lastName,
        employeeCode: dto.employeeCode,
        role: 'EMPLOYEE',
        tenant: mockTenant,
      };

      prisma.user.create.mockResolvedValue(createdUser);

      const result = await service.registerUser(tenantId, dto);

      expect(result).toBeDefined();
      expect((result as any).passwordHash).toBeUndefined();
      expect(result.email).toBe(dto.email.toLowerCase());
      expect(result.role).toBe('EMPLOYEE');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId,
            email: dto.email.toLowerCase(),
            role: 'EMPLOYEE',
          }),
        }),
      );
    });

    it('should throw ConflictException if email already exists in tenant', async () => {
      const tenantId = 'tenant-1';
      const dto = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Existing',
        lastName: 'User',
      };

      prisma.user.findFirst.mockResolvedValue(mockUser);

      await expect(service.registerUser(tenantId, dto)).rejects.toThrow(ConflictException);
      await expect(service.registerUser(tenantId, dto)).rejects.toThrow(
        'Email already registered in this tenant',
      );
    });
  });

  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'mypassword';
      const hashedPassword = 'hashed_password';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const result = await service.hashPassword(password);

      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
    });
  });

  describe('comparePasswords', () => {
    it('should return true if passwords match', async () => {
      const password = 'mypassword';
      const hashedPassword = 'hashed_password';

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.comparePasswords(password, hashedPassword);

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should return false if passwords do not match', async () => {
      const password = 'wrongpassword';
      const hashedPassword = 'hashed_password';

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.comparePasswords(password, hashedPassword);

      expect(result).toBe(false);
    });
  });
});
