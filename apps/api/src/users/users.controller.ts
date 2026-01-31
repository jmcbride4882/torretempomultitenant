import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../auth/interfaces/request-user.interface';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * List all users in tenant (paginated)
   * GET /api/users
   * ADMIN/MANAGER/GLOBAL_ADMIN only
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.GLOBAL_ADMIN)
  async findAll(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 50;

    // GLOBAL_ADMIN users don't have tenantId - return empty for now
    // TODO: Allow GLOBAL_ADMIN to specify tenantId via query parameter
    if (!user.tenantId) {
      return { users: [], total: 0, page: pageNum, pageSize: pageSizeNum };
    }

    return this.usersService.findAll(user.tenantId, pageNum, pageSizeNum);
  }

  /**
   * Get current user profile
   * GET /api/users/me
   */
  @Get('me')
  async getCurrentUser(@CurrentUser() user: RequestUser) {
    // GLOBAL_ADMIN users have null tenantId, but can still get their own profile
    return this.usersService.getCurrentUser(user.sub, user.tenantId || null);
  }

  /**
   * Change own password
   * PATCH /api/users/me/password
   */
  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
  ) {
    // GLOBAL_ADMIN users have null tenantId, but can still change their own password
    return this.usersService.changePassword(
      user.sub,
      user.tenantId || null,
      dto,
      user.email,
    );
  }

  /**
   * Get single user by ID
   * GET /api/users/:id
   */
  @Get(':id')
  async findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    // GLOBAL_ADMIN users don't have tenantId - allow null for cross-tenant lookup
    return this.usersService.findOne(id, user.tenantId || null);
  }

  /**
   * Create new user
   * POST /api/users
   * ADMIN/MANAGER/GLOBAL_ADMIN only
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.GLOBAL_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: RequestUser, @Body() dto: CreateUserDto) {
    // GLOBAL_ADMIN users don't have tenantId - they cannot create users
    // TODO: Allow GLOBAL_ADMIN to specify tenantId via query parameter
    if (!user.tenantId) {
      throw new BadRequestException('GLOBAL_ADMIN users cannot create users without specifying a tenant');
    }
    return this.usersService.create(
      user.tenantId,
      dto,
      user.sub,
      user.email,
      user.role,
    );
  }

  /**
   * Update user
   * PATCH /api/users/:id
   * ADMIN/MANAGER/GLOBAL_ADMIN only
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER, Role.GLOBAL_ADMIN)
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    // GLOBAL_ADMIN users don't have tenantId - they cannot update users
    // TODO: Allow GLOBAL_ADMIN to specify tenantId via query parameter
    if (!user.tenantId) {
      throw new BadRequestException('GLOBAL_ADMIN users cannot update users without specifying a tenant');
    }
    return this.usersService.update(
      id,
      user.tenantId,
      dto,
      user.sub,
      user.email,
      user.role,
    );
  }

  /**
   * Soft delete user (set isActive=false)
   * DELETE /api/users/:id
   * ADMIN/GLOBAL_ADMIN only
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.GLOBAL_ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    // GLOBAL_ADMIN users don't have tenantId - they cannot delete users
    // TODO: Allow GLOBAL_ADMIN to specify tenantId via query parameter
    if (!user.tenantId) {
      throw new BadRequestException('GLOBAL_ADMIN users cannot delete users without specifying a tenant');
    }
    return this.usersService.remove(
      id,
      user.tenantId,
      user.sub,
      user.email,
      user.role,
    );
  }
}
