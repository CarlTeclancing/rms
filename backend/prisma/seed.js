import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const permissions = [
  'dashboard:read',
  'sales:read',
  'sales:write',
  'menu:write',
  'stock:write',
  'expenses:read',
  'expenses:write',
  'reports:read',
  'users:write'
];

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: { permissions },
    create: { name: 'Admin', description: 'Full system access', permissions }
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

  const admin = await prisma.user.upsert({
    where: { email: 'admin@restaurant.test' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@restaurant.test',
      passwordHash: await bcrypt.hash('Admin123!', 12),
      roleId: adminRole.id
    }
  });

  const categories = {};
  for (const name of ['Breakfast', 'Mains', 'Drinks', 'Desserts']) {
    categories[name] = await prisma.menuCategory.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  const expenseCategories = {};
  for (const name of ['Utilities', 'Supplies', 'Payroll', 'Rent', 'Maintenance']) {
    expenseCategories[name] = await prisma.expenseCategory.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  const supplier = await prisma.supplier.create({
    data: { name: 'Fresh Market Supplier', phone: '+237 600 000 000', email: 'orders@freshmarket.test' }
  });

  const ingredientData = [
    ['Rice', 'kg', 50, 10, 1.4],
    ['Chicken', 'kg', 30, 8, 4.2],
    ['Tomato', 'kg', 25, 5, 1.1],
    ['Coffee Beans', 'kg', 12, 3, 8],
    ['Milk', 'l', 20, 5, 1.2],
    ['Flour', 'kg', 40, 8, 0.9]
  ];

  const ingredients = {};
  for (const [name, unit, quantity, reorderLevel, unitCost] of ingredientData) {
    const ingredient = await prisma.ingredient.upsert({
      where: { name },
      update: {},
      create: { name, unit }
    });
    ingredients[name] = ingredient;
    await prisma.stockItem.upsert({
      where: { ingredientId: ingredient.id },
      update: { quantity, reorderLevel, unitCost },
      create: { name, unit, quantity, reorderLevel, unitCost, ingredientId: ingredient.id, supplierId: supplier.id }
    });
  }

  const jollof = await prisma.menuItem.create({
    data: {
      name: 'Jollof Rice Bowl',
      description: 'Spiced rice with chicken and tomato sauce',
      price: 8.5,
      imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=900&q=80',
      categoryId: categories.Mains.id,
      recipeIngredients: {
        create: [
          { ingredientId: ingredients.Rice.id, quantity: 0.25 },
          { ingredientId: ingredients.Chicken.id, quantity: 0.18 },
          { ingredientId: ingredients.Tomato.id, quantity: 0.08 }
        ]
      }
    }
  });

  const latte = await prisma.menuItem.create({
    data: {
      name: 'Cafe Latte',
      description: 'Espresso with steamed milk',
      price: 3.75,
      imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=80',
      categoryId: categories.Drinks.id,
      recipeIngredients: {
        create: [
          { ingredientId: ingredients['Coffee Beans'].id, quantity: 0.025 },
          { ingredientId: ingredients.Milk.id, quantity: 0.2 }
        ]
      }
    }
  });

  await prisma.menuItem.create({
    data: {
      name: 'Pancake Stack',
      description: 'Fluffy pancakes served with syrup',
      price: 5.5,
      imageUrl: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=900&q=80',
      categoryId: categories.Breakfast.id,
      recipeIngredients: { create: [{ ingredientId: ingredients.Flour.id, quantity: 0.15 }] }
    }
  });

  await prisma.expense.create({
    data: {
      title: 'Monthly electricity bill',
      amount: 180,
      categoryId: expenseCategories.Utilities.id,
      userId: admin.id,
      expenseDate: new Date()
    }
  });

  await prisma.sale.create({
    data: {
      orderNo: `ORD-SEED-${Date.now()}`,
      userId: admin.id,
      subtotal: 12.25,
      total: 12.25,
      saleItems: {
        create: [
          { menuItemId: jollof.id, quantity: 1, unitPrice: 8.5, total: 8.5 },
          { menuItemId: latte.id, quantity: 1, unitPrice: 3.75, total: 3.75 }
        ]
      },
      payments: { create: { method: 'CASH', amount: 12.25 } }
    }
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
