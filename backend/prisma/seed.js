import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const adminPermissions = [
  'dashboard:read',
  'sales:read',
  'sales:write',
  'menu:write',
  'stock:write',
  'expenses:read',
  'expenses:write',
  'reports:read',
  'promotions:read',
  'promotions:write',
  'users:write'
];

const appSettings = {
  restaurantName: 'ChopASAP',
  shortName: 'ChopASAP',
  currency: 'XAF',
  deliveryFee: 1000,
  publicOrdering: true,
  reservations: true,
  supportPhone: '+237671286999'
};

async function main() {
  const adminPasswordHash = await bcrypt.hash('@data&Chop.com', 12);
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: { permissions: adminPermissions },
    create: { name: 'Admin', description: 'Full system access', permissions: adminPermissions }
  });

  await prisma.role.upsert({
    where: { name: 'Cashier' },
    update: {},
    create: {
      name: 'Cashier',
      description: 'POS and basic reporting access',
      permissions: ['dashboard:read', 'sales:read', 'sales:write']
    }
  });

  await prisma.user.upsert({
    where: { email: 'app@chopasap.com' },
    update: { passwordHash: adminPasswordHash, roleId: adminRole.id, status: 'ACTIVE' },
    create: {
      name: 'ChopASAP Admin',
      email: 'app@chopasap.com',
      passwordHash: adminPasswordHash,
      roleId: adminRole.id
    }
  });

  await prisma.appSettings.upsert({
    where: { id: 'default' },
    update: appSettings,
    create: appSettings
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
