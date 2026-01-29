import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantsModule } from '../tenants/tenants.module';
import { ComplianceService } from './compliance.service';

@Module({
  imports: [PrismaModule, TenantsModule],
  providers: [ComplianceService],
  exports: [ComplianceService],
})
export class ComplianceModule {}
