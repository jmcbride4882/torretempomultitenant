import { Module } from '@nestjs/common';
import { GlobalAdminController } from './global-admin.controller';
import { GlobalAdminService } from './global-admin.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GlobalAdminController],
  providers: [GlobalAdminService],
})
export class GlobalAdminModule {}
