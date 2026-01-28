import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Set the current tenant context for RLS policies
   * Call this at the start of each request
   */
  async setTenantContext(tenantId: string): Promise<void> {
    await this.$executeRawUnsafe(
      `SET app.current_tenant = '${tenantId}'`,
    );
  }

  /**
   * Clear tenant context (for admin operations)
   */
  async clearTenantContext(): Promise<void> {
    await this.$executeRawUnsafe(`RESET app.current_tenant`);
  }
}
