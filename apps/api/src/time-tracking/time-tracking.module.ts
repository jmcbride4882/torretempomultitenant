import { Module, forwardRef } from '@nestjs/common';
import { TimeTrackingController } from './time-tracking.controller';
import { TimeTrackingService } from './time-tracking.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { LocationsModule } from '../locations/locations.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { OvertimeModule } from '../overtime/overtime.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AuditModule,
    ComplianceModule,
    OvertimeModule,
    forwardRef(() => LocationsModule),
  ],
  controllers: [TimeTrackingController],
  providers: [TimeTrackingService],
  exports: [TimeTrackingService],
})
export class TimeTrackingModule {}
