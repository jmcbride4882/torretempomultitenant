import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TimeTrackingModule } from './time-tracking/time-tracking.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { HealthController } from './health.controller';
import { TenantMiddleware } from './common/middleware/tenant.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    AuthModule,
    TimeTrackingModule,
    ApprovalsModule,
    // Wave 2 modules (remaining):
    // LocationsModule,
    // SchedulingModule,
    // ReportsModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
