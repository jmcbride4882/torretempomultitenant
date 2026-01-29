import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { ValidateQRDto } from './dto/validate-qr.dto';
import { ValidateGeofenceDto } from './dto/validate-geofence.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('locations')
@UseGuards(JwtAuthGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  /**
   * Create a new location (ADMIN only)
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  create(@CurrentUser() user: any, @Body() dto: CreateLocationDto) {
    return this.locationsService.create(user.tenantId, dto);
  }

  /**
   * Get all locations for tenant
   */
  @Get()
  findAll(@CurrentUser() user: any) {
    return this.locationsService.findAll(user.tenantId);
  }

  /**
   * Get single location by ID
   */
  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.locationsService.findOne(user.tenantId, id);
  }

  /**
   * Update a location (ADMIN only)
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.locationsService.update(user.tenantId, id, dto);
  }

  /**
   * Delete a location (ADMIN only)
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.locationsService.remove(user.tenantId, id);
  }

  /**
   * Generate QR code for a location (ADMIN only)
   * Returns base64 PNG data URL
   */
  @Post(':id/generate-qr')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async generateQR(@CurrentUser() user: any, @Param('id') id: string) {
    const qrCodeDataUrl = await this.locationsService.generateQRCodeImage(
      user.tenantId,
      id,
    );
    return { qrCode: qrCodeDataUrl };
  }

  /**
   * Validate QR token (any authenticated user)
   */
  @Post('validate-qr')
  async validateQR(@Body() dto: ValidateQRDto) {
    const location = await this.locationsService.validateQRToken(dto.token);
    return {
      valid: true,
      location: {
        id: location.id,
        name: location.name,
      },
    };
  }

  /**
   * Validate geofence (any authenticated user)
   */
  @Post('validate-geofence')
  async validateGeofence(@Body() dto: ValidateGeofenceDto) {
    const valid = await this.locationsService.validateGeofence(
      dto.locationId,
      dto.latitude,
      dto.longitude,
    );
    return { valid };
  }
}
