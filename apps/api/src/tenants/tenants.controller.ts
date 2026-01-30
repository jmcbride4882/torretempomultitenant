import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Query,
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
    @Roles(Role.GLOBAL_ADMIN)
   async listAllTenants(
     @Query('page') page?: string,
     @Query('pageSize') pageSize?: string,
     @Query('search') search?: string,
   ) {
     const pageNum = page ? parseInt(page, 10) : 1;
     const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 50;
     return this.tenantsService.listAllTenants(pageNum, pageSizeNum, search);
   }

   /**
    * Get tenant by ID (GLOBAL_ADMIN only)
    * GET /api/tenants/:id
    */
   @Get(':id')
   @UseGuards(RolesGuard)
   @Roles(Role.GLOBAL_ADMIN)
  async getTenantById(@Param('id') id: string) {
    return this.tenantsService.getTenantById(id);
  }

   /**
    * Update tenant by ID (GLOBAL_ADMIN only)
    * PATCH /api/tenants/:id
    */
   @Patch(':id')
   @UseGuards(RolesGuard)
   @Roles(Role.GLOBAL_ADMIN)
  async updateTenantById(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenantsService.updateTenant(
      id,
      user.id,
      user.email,
      user.role,
      dto,
    );
  }

   /**
    * Create new tenant (GLOBAL_ADMIN only)
    * POST /api/tenants
    */
   @Post()
   @UseGuards(RolesGuard)
   @Roles(Role.GLOBAL_ADMIN)
  async createTenant(
    @CurrentUser() user: any,
    @Body() dto: CreateTenantDto,
  ) {
    return this.tenantsService.createTenant(dto, user.id, user.email);
  }
}
