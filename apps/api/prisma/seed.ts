import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Check if global admin tenant already exists
  const existingTenant = await prisma.tenant.findUnique({
    where: { slug: 'lslt-group' },
  });

  if (existingTenant) {
    console.log('✅ Global admin tenant already exists. Skipping seed.');
    return;
  }

  // Hash the default password
  const passwordHash = await bcrypt.hash('Summer15', 12);

  // Create global admin tenant and user
  const tenant = await prisma.tenant.create({
    data: {
      name: 'LSLT Group',
      slug: 'lslt-group',
      timezone: 'Europe/Madrid',
      locale: 'es',
      convenioCode: '30000805011981',
      maxWeeklyHours: 40,
      maxAnnualHours: 1822,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'info@lsltgroup.es',
      passwordHash,
      firstName: 'LSLT',
      lastName: 'Admin',
      role: 'ADMIN',
      employeeCode: 'ADMIN001',
    },
  });

  console.log('✅ Global admin tenant created:');
  console.log(`   Tenant: ${tenant.name} (${tenant.slug})`);
  console.log(`   Admin: ${adminUser.email}`);
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
