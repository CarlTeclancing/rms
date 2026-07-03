import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const range = (query) => ({
  gte: query.from ? new Date(query.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  lte: query.to ? new Date(query.to) : new Date()
});

const optionalFindMany = (delegate, args) => (delegate?.findMany ? delegate.findMany(args).catch(() => []) : Promise.resolve([]));

export const salesReport = asyncHandler(async (req, res) => {
  const createdAt = range(req.query);
  const sales = await prisma.sale.findMany({
    where: { createdAt, status: 'COMPLETED' },
    include: { saleItems: { include: { menuItem: true } }, payments: true },
    orderBy: { createdAt: 'desc' }
  });
  const onlineOrders = await optionalFindMany(prisma.onlineOrder, {
    where: { createdAt, status: { not: 'CANCELLED' } },
    include: { items: { include: { menuItem: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json({
    totalSales: sales.reduce((sum, sale) => sum + Number(sale.total), 0) + onlineOrders.reduce((sum, order) => sum + Number(order.total), 0),
    posSales: sales.reduce((sum, sale) => sum + Number(sale.total), 0),
    onlineSales: onlineOrders.reduce((sum, order) => sum + Number(order.total), 0),
    orders: sales.length + onlineOrders.length,
    itemsSold: sales.reduce((sum, sale) => sum + sale.saleItems.reduce((inner, item) => inner + item.quantity, 0), 0),
    sales,
    onlineOrders
  });
});

export const expensesReport = asyncHandler(async (req, res) => {
  const expenses = await prisma.expense.findMany({
    where: { expenseDate: range(req.query) },
    include: { category: true, supplier: true },
    orderBy: { expenseDate: 'desc' }
  });
  const byCategory = expenses.reduce((acc, expense) => {
    const key = expense.category.name;
    acc[key] = (acc[key] || 0) + Number(expense.amount);
    return acc;
  }, {});
  res.json({ totalExpenses: expenses.reduce((sum, expense) => sum + Number(expense.amount), 0), byCategory, expenses });
});
