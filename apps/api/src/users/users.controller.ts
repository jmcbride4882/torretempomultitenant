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
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * List all users in tenant (paginated)
   * GET /api/users
   * ADMIN/MANAGER only
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  async findAll(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 50;

    return this.usersService.findAll(user.tenantId, pageNum, pageSizeNum);
  }

  /**
   * Get current user profile
   * GET /api/users/me
   */
  @Get('me')
  async getCurrentUser(@CurrentUser() user: any) {
    return this.usersService.getCurrentUser(user.sub, user.tenantId);
  }

  /**
   * Change own password
   * PATCH /api/users/me/password
   */
  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(
      user.sub,
      user.tenantId,
      dto,
      user.email,
    );
  }

  /**
   * Get single user by ID
   * GET /api/users/:id
   */
  @Get(':id')
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.findOne(id, user.tenantId);
  }

  /**
   * Create new user
   * POST /api/users
   * ADMIN/MANAGER only
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: any, @Body() dto: CreateUserDto) {
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
   * ADMIN/MANAGER only
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
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
   * ADMIN only
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.remove(
      id,
      user.tenantId,
      user.sub,
      user.email,
      user.role,
    );
  }
}
