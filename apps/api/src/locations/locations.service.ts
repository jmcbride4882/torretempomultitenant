import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import * as QRCode from 'qrcode';
import { getDistance } from 'geolib';

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new location with automatic QR token generation
   */
  async create(tenantId: string, dto: CreateLocationDto) {
    const location = await this.prisma.location.create({
      data: {
        tenantId,
        name: dto.name,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        radiusMeters: dto.radiusMeters ?? 100,
        qrEnabled: dto.qrEnabled ?? true,
        isActive: dto.isActive ?? true,
      },
    });

    // Auto-generate QR token if QR is enabled
    if (location.qrEnabled) {
      await this.generateQRToken(location.id);
    }

    this.logger.log(`Created location ${location.id} for tenant ${tenantId}`);
    return location;
  }

  /**
   * Get all locations for a tenant
   */
  async findAll(tenantId: string) {
    return this.prisma.location.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      include: {
        qrTokens: {
          where: {
            isActive: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single location by ID
   */
  async findOne(tenantId: string, id: string) {
    const location = await this.prisma.location.findFirst({
      where: {
        id,
        tenantId,
        isActive: true,
      },
      include: {
        qrTokens: {
          where: {
            isActive: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${id} not found`);
    }

    return location;
  }

  /**
   * Update a location
   */
  async update(tenantId: string, id: string, dto: UpdateLocationDto) {
    // Verify location exists and belongs to tenant
    await this.findOne(tenantId, id);

    const location = await this.prisma.location.update({
      where: { id },
      data: {
        name: dto.name,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        radiusMeters: dto.radiusMeters,
        qrEnabled: dto.qrEnabled,
        isActive: dto.isActive,
      },
    });

    this.logger.log(`Updated location ${id}`);
    return location;
  }

  /**
   * Soft delete a location
   */
  async remove(tenantId: string, id: string) {
    // Verify location exists and belongs to tenant
    await this.findOne(tenantId, id);

    await this.prisma.location.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(`Soft deleted location ${id}`);
    return { message: 'Location deleted successfully' };
  }

  /**
   * Generate a new QR token for a location and return QR code as base64 PNG
   */
  async generateQRToken(locationId: string): Promise<string> {
    // Create QR token
    const qrToken = await this.prisma.qRToken.create({
      data: {
        locationId,
        isActive: true,
      },
    });

    this.logger.log(`Generated QR token ${qrToken.id} for location ${locationId}`);
    return qrToken.token;
  }

  /**
   * Generate QR code image as base64 PNG data URL
   */
  async generateQRCodeImage(tenantId: string, locationId: string): Promise<string> {
    // Verify location exists and belongs to tenant
    const location = await this.findOne(tenantId, locationId);

    if (!location.qrEnabled) {
      throw new BadRequestException('QR codes are disabled for this location');
    }

    // Get or create active QR token
    let qrToken = location.qrTokens?.[0];
    if (!qrToken) {
      const token = await this.generateQRToken(locationId);
      qrToken = { token, id: '', locationId, isActive: true, expiresAt: null, createdAt: new Date() };
    }

    // Generate QR code as data URL (base64 PNG)
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(qrToken.token, {
        width: 512,
        margin: 2,
        errorCorrectionLevel: 'H',
      });

      return qrCodeDataUrl;
    } catch (error) {
      this.logger.error(`Failed to generate QR code: ${error}`);
      throw new BadRequestException('Failed to generate QR code');
    }
  }

  /**
   * Validate QR token
   * Returns location if valid, throws exception if invalid/expired
   */
  async validateQRToken(token: string) {
    const qrToken = await this.prisma.qRToken.findUnique({
      where: { token },
      include: {
        location: true,
      },
    });

    if (!qrToken) {
      throw new BadRequestException('Invalid QR code');
    }

    if (!qrToken.isActive) {
      throw new BadRequestException('QR code has been deactivated');
    }

    if (qrToken.expiresAt && qrToken.expiresAt < new Date()) {
      throw new BadRequestException('QR code has expired');
    }

    if (!qrToken.location.isActive) {
      throw new BadRequestException('This location is no longer active');
    }

    if (!qrToken.location.qrEnabled) {
      throw new BadRequestException('QR codes are disabled for this location');
    }

    this.logger.log(`Validated QR token ${qrToken.id} for location ${qrToken.locationId}`);
    return qrToken.location;
  }

  /**
   * Validate geofence
   * Returns true if within radius, throws exception if outside
   */
  async validateGeofence(
    locationId: string,
    userLat: number,
    userLng: number,
  ): Promise<boolean> {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${locationId} not found`);
    }

    if (!location.isActive) {
      throw new BadRequestException('This location is no longer active');
    }

    if (!location.latitude || !location.longitude) {
      throw new BadRequestException('This location does not have geofence coordinates');
    }

    // Calculate distance using Haversine formula (geolib)
    const distanceInMeters = getDistance(
      { latitude: location.latitude, longitude: location.longitude },
      { latitude: userLat, longitude: userLng },
    );

    const radiusMeters = location.radiusMeters ?? 100;

    if (distanceInMeters > radiusMeters) {
      throw new BadRequestException(
        `You are ${distanceInMeters}m away. Must be within ${radiusMeters}m of the location.`,
      );
    }

    this.logger.log(
      `Validated geofence for location ${locationId}: ${distanceInMeters}m (limit: ${radiusMeters}m)`,
    );
    return true;
  }
}
