import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  /**
   * Get current tenant information
   * GET /api/tenants/current
   */
  @Get('current')
  async getCurrentTenant(@CurrentUser() user: any) {
    return this.tenantsService.getTenant(user.tenantId);
  }

  /**
   * Update tenant settings (ADMIN only)
   * PATCH /api/tenants/current
   */
  @Patch('current')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async updateCurrentTenant(
    @CurrentUser() user: any,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenantsService.updateTenant(
      user.tenantId,
      user.id,
      user.email,
      user.role,
      dto,
    );
  }

  /**
   * Get tenant statistics
   * GET /api/tenants/stats
   */
  @Get('stats')
  async getTenantStats(@CurrentUser() user: any) {
    return this.tenantsService.getTenantStats(user.tenantId);
  }

  /**
   * List all tenants (GLOBAL_ADMIN only)
   * GET /api/tenants
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN' as any)
  async listAllTenants() {
    return this.tenantsService.listAllTenants();
  }

  /**
   * Get tenant by ID (GLOBAL_ADMIN only)
   * GET /api/tenants/:id
   */
  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN' as any)
  async getTenantById(@Param('id') id: string) {
    return this.tenantsService.getTenantById(id);
  }

  /**
   * Create new tenant (GLOBAL_ADMIN only)
   * POST /api/tenants
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('GLOBAL_ADMIN' as any)
  async createTenant(
    @CurrentUser() user: any,
    @Body() dto: CreateTenantDto,
  ) {
    return this.tenantsService.createTenant(dto, user.id, user.email);
  }
}
