import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { toUserResponse, UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * List all users in tenant (paginated)
   * ADMIN/MANAGER only
   */
  async findAll(
    tenantId: string,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<{ users: UserResponseDto[]; total: number; page: number; pageSize: number }> {
    const skip = (page - 1) * pageSize;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.user.count({
        where: { tenantId },
      }),
    ]);

    return {
      users: users.map(toUserResponse),
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get single user by ID (same tenant only)
   * For GLOBAL_ADMIN (tenantId=null), allows cross-tenant lookup
   */
  async findOne(userId: string, tenantId: string | null): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return toUserResponse(user);
  }

  /**
   * Create new user (ADMIN/MANAGER only)
   */
  async create(
    tenantId: string,
    dto: CreateUserDto,
    actorId: string,
    actorEmail: string,
    actorRole: string,
  ): Promise<UserResponseDto> {
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
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        employeeCode: dto.employeeCode,
        locale: dto.locale,
        role: 'EMPLOYEE', // Always create as EMPLOYEE
      },
    });

    this.logger.log(
      `User ${user.id} (${user.email}) created in tenant ${tenantId} by ${actorEmail}`,
    );

    // Create audit log
    await this.auditService.createLog({
      tenantId,
      action: 'USER_CREATED',
      entity: 'User',
      entityId: user.id,
      actorId,
      actorEmail,
      actorRole,
      changes: {
        after: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          employeeCode: user.employeeCode,
          role: user.role,
        },
      },
    });

    return toUserResponse(user);
  }

  /**
   * Update user (ADMIN/MANAGER only)
   */
  async update(
    userId: string,
    tenantId: string,
    dto: UpdateUserDto,
    actorId: string,
    actorEmail: string,
    actorRole: string,
  ): Promise<UserResponseDto> {
    // Check if user exists in tenant
    const existingUser = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Store before state for audit
    const beforeState = {
      firstName: existingUser.firstName,
      lastName: existingUser.lastName,
      employeeCode: existingUser.employeeCode,
      role: existingUser.role,
      isActive: existingUser.isActive,
      locale: existingUser.locale,
    };

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.employeeCode !== undefined && { employeeCode: dto.employeeCode }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.locale !== undefined && { locale: dto.locale }),
      },
    });

    this.logger.log(`User ${userId} updated by ${actorEmail}`);

    // Create audit log
    await this.auditService.createLog({
      tenantId,
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: userId,
      actorId,
      actorEmail,
      actorRole,
      changes: {
        before: beforeState,
        after: {
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          employeeCode: updatedUser.employeeCode,
          role: updatedUser.role,
          isActive: updatedUser.isActive,
          locale: updatedUser.locale,
        },
      },
    });

    return toUserResponse(updatedUser);
  }

  /**
   * Soft delete user (ADMIN only, set isActive=false)
   */
  async remove(
    userId: string,
    tenantId: string,
    actorId: string,
    actorEmail: string,
    actorRole: string,
  ): Promise<{ message: string }> {
    // Check if user exists in tenant
    const existingUser = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Prevent deleting self
    if (userId === actorId) {
      throw new BadRequestException('Cannot deactivate your own account');
    }

    // Soft delete by setting isActive=false
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    this.logger.log(`User ${userId} deactivated by ${actorEmail}`);

    // Create audit log
    await this.auditService.createLog({
      tenantId,
      action: 'USER_DELETED',
      entity: 'User',
      entityId: userId,
      actorId,
      actorEmail,
      actorRole,
      changes: {
        before: { isActive: existingUser.isActive },
        after: { isActive: false },
      },
    });

    return { message: 'User deactivated successfully' };
  }

  /**
   * Get current user profile
   * For GLOBAL_ADMIN, tenantId will be null
   */
  async getCurrentUser(userId: string, tenantId: string | null): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return toUserResponse(user);
  }

  /**
   * Change own password
   * For GLOBAL_ADMIN, tenantId will be null
   */
  async changePassword(
    userId: string,
    tenantId: string | null,
    dto: ChangePasswordDto,
    actorEmail: string,
  ): Promise<{ message: string }> {
    // Get user with password hash
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(dto.newPassword, 12);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    this.logger.log(`Password changed for user ${userId} (${actorEmail})`);

    // Create audit log (without password details) - handle null tenantId for GLOBAL_ADMIN
    if (tenantId) {
      await this.auditService.createLog({
        tenantId,
        action: 'PASSWORD_CHANGED',
        entity: 'User',
        entityId: userId,
        actorId: userId,
        actorEmail,
        actorRole: user.role,
      });
    }

    return { message: 'Password changed successfully' };
  }
}
