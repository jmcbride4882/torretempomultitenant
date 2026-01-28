import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto, RegisterTenantDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Validate user credentials
   * @returns User object without password if valid, null otherwise
   */
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        isActive: true,
      },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await this.comparePasswords(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      return null;
    }

    // Remove password from returned user object
    const { passwordHash, ...result } = user;
    return result;
  }

  /**
   * Login user and generate JWT token
   */
  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
        },
      },
    };
  }

  /**
   * Register new tenant with admin user
   */
  async registerTenant(dto: RegisterTenantDto) {
    // Check if email already exists
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.adminEmail.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

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

    // Hash password
    const passwordHash = await this.hashPassword(dto.adminPassword);

    // Create tenant and admin user in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: dto.companyName,
          slug,
          timezone: dto.timezone || 'Europe/Madrid',
          locale: dto.locale || 'es',
        },
      });

      // Create admin user
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.adminEmail.toLowerCase(),
          passwordHash,
          firstName: dto.adminFirstName,
          lastName: dto.adminLastName,
          role: 'ADMIN',
        },
      });

      return { tenant, user };
    });

    // Generate JWT token
    const payload = {
      sub: result.user.id,
      email: result.user.email,
      tenantId: result.user.tenantId,
      role: result.user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        tenantId: result.user.tenantId,
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          slug: result.tenant.slug,
        },
      },
    };
  }

  /**
   * Register new user in existing tenant (by admin/manager)
   */
  async registerUser(tenantId: string, dto: RegisterUserDto) {
    // Check if email already exists in tenant
    const existingUser = await this.prisma.user.findFirst({
      where: {
        tenantId,
        email: dto.email.toLowerCase(),
      },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered in this tenant');
    }

    // Hash password
    const passwordHash = await this.hashPassword(dto.password);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        employeeCode: dto.employeeCode,
        role: 'EMPLOYEE',
      },
      include: {
        tenant: true,
      },
    });

    // Remove password from returned user object
    const { passwordHash: _, ...result } = user;
    return result;
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare plain password with hashed password
   */
  async comparePasswords(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
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
