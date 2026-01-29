import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Check if global admin user already exists
  const existingGlobalAdmin = await prisma.user.findFirst({
    where: { email: 'info@lsltgroup.es' },
  });

  if (existingGlobalAdmin) {
    console.log('✅ Global admin user already exists. Skipping seed.');
    return;
  }

  // Hash the default password
  const passwordHash = await bcrypt.hash('Summer15', 12);

  // Create GLOBAL_ADMIN user (no tenant association)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalAdmin = await prisma.user.create({
    data: {
      tenantId: undefined,
      email: 'info@lsltgroup.es',
      passwordHash,
      firstName: 'LSLT',
      lastName: 'Global Admin',
      role: 'GLOBAL_ADMIN' as any, // Type will be correct after Prisma regenerate
    } as any,
  });

  console.log('✅ Global admin user created:');
  console.log(`   Email: ${globalAdmin.email}`);
  console.log(`   Role: GLOBAL_ADMIN`);
  console.log(`   Password: Summer15`);
  console.log('');

  // Create a demo tenant for testing
  const demoTenant = await prisma.tenant.create({
    data: {
      name: 'Demo Company',
      slug: 'demo-company',
      timezone: 'Europe/Madrid',
      locale: 'es',
      convenioCode: '30000805011981',
      maxWeeklyHours: 40,
      maxAnnualHours: 1822,
    },
  });

  // Create demo admin for the demo tenant
  const demoAdmin = await prisma.user.create({
    data: {
      tenantId: demoTenant.id,
      email: 'admin@demo.com',
      passwordHash,
      firstName: 'Demo',
      lastName: 'Admin',
      role: 'ADMIN',
      employeeCode: 'DEMO001',
    },
  });

  console.log('✅ Demo tenant created:');
  console.log(`   Tenant: ${demoTenant.name} (${demoTenant.slug})`);
  console.log(`   Admin: ${demoAdmin.email}`);
  console.log(`   Password: Summer15`);
  console.log('');
  console.log('⚠️  IMPORTANT: Change the default password after first login!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
