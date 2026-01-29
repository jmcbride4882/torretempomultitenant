import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { WinstonModule } from 'nest-winston';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TimeTrackingModule } from './time-tracking/time-tracking.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { ReportsModule } from './reports/reports.module';
import { LocationsModule } from './locations/locations.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { AuditModule } from './audit/audit.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { HealthController } from './health.controller';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { loggerConfig } from './config/logger.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    WinstonModule.forRoot(loggerConfig),
    NestScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    TimeTrackingModule,
    ApprovalsModule,
    ReportsModule,
    LocationsModule,
    SchedulingModule,
    AuditModule,
    TenantsModule,
    UsersModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
