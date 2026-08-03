import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const defaultFrom = () => {
  const date = new Date();
  date.setDate(date.getDate() - 29);
  date.setHours(0, 0, 0, 0);
  return date;
};

const range = (query) => ({
  gte: query.from ? new Date(query.from) : defaultFrom(),
  lte: query.to ? new Date(query.to) : new Date()
});

const optionalFindMany = (delegate, args) => (delegate?.findMany ? delegate.findMany(args).catch(() => []) : Promise.resolve([]));
const paidOnlineOrderWhere = { status: 'DELIVERED' };
const kindLabel = (kind) => (kind || 'OTHER').toLowerCase();
const emptyKindTotals = () => ({
  food: { total: 0, quantity: 0 },
  drink: { total: 0, quantity: 0 },
  other: { total: 0, quantity: 0 }
});

const addKindTotal = (totals, item) => {
  const key = kindLabel(item.menuItem?.category?.kind);
  const bucket = totals[key] || totals.other;
  bucket.total += Number(item.total || 0);
  bucket.quantity += Number(item.quantity || 0);
};

const dayKey = (date) => new Date(date).toISOString().slice(0, 10);

export const salesReport = asyncHandler(async (req, res) => {
  const createdAt = range(req.query);
  const sales = await prisma.sale.findMany({
    where: { createdAt, status: 'COMPLETED' },
    include: { saleItems: { include: { menuItem: { include: { category: true } } } }, payments: true },
    orderBy: { createdAt: 'desc' }
  });
  const onlineOrders = await optionalFindMany(prisma.onlineOrder, {
    where: { createdAt, ...paidOnlineOrderWhere },
    include: { items: { include: { menuItem: { include: { category: true } } } } },
    orderBy: { createdAt: 'desc' }
  });
  const categoryBreakdown = emptyKindTotals();
  const byDay = new Map();

  for (const sale of sales) {
    const key = dayKey(sale.createdAt);
    const current = byDay.get(key) || { date: key, posSales: 0, onlineSales: 0, totalSales: 0, orders: 0 };
    current.posSales += Number(sale.total || 0);
    current.totalSales += Number(sale.total || 0);
    current.orders += 1;
    byDay.set(key, current);
    sale.saleItems.forEach((item) => addKindTotal(categoryBreakdown, item));
  }

  for (const order of onlineOrders) {
    const key = dayKey(order.createdAt);
    const current = byDay.get(key) || { date: key, posSales: 0, onlineSales: 0, totalSales: 0, orders: 0 };
    current.onlineSales += Number(order.total || 0);
    current.totalSales += Number(order.total || 0);
    current.orders += 1;
    byDay.set(key, current);
    order.items.forEach((item) => addKindTotal(categoryBreakdown, item));
  }

  const posSales = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const onlineSales = onlineOrders.reduce((sum, order) => sum + Number(order.total), 0);
  res.json({
    totalSales: posSales + onlineSales,
    posSales,
    onlineSales,
    orders: sales.length + onlineOrders.length,
    itemsSold:
      sales.reduce((sum, sale) => sum + sale.saleItems.reduce((inner, item) => inner + item.quantity, 0), 0) +
      onlineOrders.reduce((sum, order) => sum + order.items.reduce((inner, item) => inner + item.quantity, 0), 0),
    categoryBreakdown,
    history: [...byDay.values()].sort((a, b) => b.date.localeCompare(a.date)),
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
