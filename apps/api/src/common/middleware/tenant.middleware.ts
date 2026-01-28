import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Extract tenant context from JWT payload (set by JwtStrategy)
    const user = (req as any).user;

    if (user && user.tenantId) {
      // Set tenant context for RLS
      await this.prisma.setTenantContext(user.tenantId);
    }

    next();
  }
}
