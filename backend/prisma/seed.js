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
  'debtors:read',
  'debtors:write',
  'promotions:read',
  'promotions:write',
  'marketing:read',
  'marketing:write',
  'users:write'
];

const marketingPermissions = [
  'marketing:read',
  'marketing:write',
  'promotions:read',
  'promotions:write',
  'sales:read',
  'sales:write',
  'menu:write'
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

const defaultMenuCategories = [
  { name: 'African', description: 'Traditional African dishes and local favourites.', kind: 'FOOD' },
  { name: 'Western', description: 'Western-style meals, grills, fries, and continental plates.', kind: 'FOOD' },
  { name: 'Ice Cream', description: 'Ice cream, desserts, and sweet treats.', kind: 'FOOD' },
  { name: 'Fruit Juice', description: 'Fresh juice and natural fruit drinks.', kind: 'DRINK' },
  { name: 'Sweet Drinks', description: 'Soft drinks, sodas, and sweet beverages.', kind: 'DRINK' },
  { name: 'Alcohol', description: 'Beer, wine, spirits, and alcoholic beverages.', kind: 'DRINK' },
  { name: 'Grocery', description: 'Packaged grocery and convenience products.', kind: 'OTHER' }
];

async function main() {
  const adminPasswordHash = await bcrypt.hash('@data&Chop.com', 12);
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: { permissions: adminPermissions },
    create: { name: 'Admin', description: 'Full system access', permissions: adminPermissions }
  });

  await prisma.role.upsert({
    where: { name: 'Cashier' },
    update: { permissions: ['dashboard:read', 'sales:read', 'sales:write'] },
    create: {
      name: 'Cashier',
      description: 'POS and basic reporting access',
      permissions: ['dashboard:read', 'sales:read', 'sales:write']
    }
  });

  await prisma.role.upsert({
    where: { name: 'Sales & Orders Operator' },
    update: { permissions: ['dashboard:read', 'sales:read', 'sales:write', 'debtors:read', 'debtors:write'] },
    create: {
      name: 'Sales & Orders Operator',
      description: 'Manages POS sales, online orders, reservations, and debtors without financial reports access',
      permissions: ['dashboard:read', 'sales:read', 'sales:write', 'debtors:read', 'debtors:write']
    }
  });

  await prisma.role.upsert({
    where: { name: 'Marketing Manager' },
    update: { permissions: marketingPermissions },
    create: {
      name: 'Marketing Manager',
      description: 'Marketing, promotions, online orders, and menu availability access. No payments, users, settings, stock, or expenses access.',
      permissions: marketingPermissions
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

  await Promise.all(
    defaultMenuCategories.map((category) =>
      prisma.menuCategory.upsert({
        where: { name: category.name },
        update: {
          description: category.description,
          kind: category.kind
        },
        create: category
      })
    )
  );
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
