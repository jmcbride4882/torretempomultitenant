import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { RetentionService } from './retention.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AuditService, RetentionService],
  exports: [AuditService, RetentionService],
})
export class AuditModule {}
