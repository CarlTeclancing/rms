import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const sumDecimal = (rows, field) => rows.reduce((sum, row) => sum + Number(row[field] || 0), 0);
const optionalFindMany = (delegate, args) => (delegate?.findMany ? delegate.findMany(args).catch(() => []) : Promise.resolve([]));

export const getStats = asyncHandler(async (_req, res) => {
  const now = new Date();
  const today = startOfDay(now);
  const month = startOfMonth(now);

  const [dailySales, monthlySales, monthlyExpenses, stockItems, recentSales, topItems, onlineOrdersResult, reservationsResult] = await Promise.allSettled([
    prisma.sale.findMany({ where: { createdAt: { gte: today }, status: 'COMPLETED' } }),
    prisma.sale.findMany({ where: { createdAt: { gte: month }, status: 'COMPLETED' } }),
    prisma.expense.findMany({ where: { expenseDate: { gte: month } } }),
    prisma.stockItem.findMany({ orderBy: { quantity: 'asc' } }),
    prisma.sale.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } }, saleItems: { include: { menuItem: true } } }
    }),
    prisma.saleItem.groupBy({
      by: ['menuItemId'],
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    }),
    optionalFindMany(prisma.onlineOrder, { where: { createdAt: { gte: month } } }),
    optionalFindMany(prisma.reservation, { where: { reservationAt: { gte: today } } })
  ]);

  const settled = [dailySales, monthlySales, monthlyExpenses, stockItems, recentSales, topItems].map((result) => {
    if (result.status === 'rejected') throw result.reason;
    return result.value;
  });
  const [safeDailySales, safeMonthlySales, safeMonthlyExpenses, safeStockItems, safeRecentSales, safeTopItems] = settled;
  const onlineOrders = onlineOrdersResult.status === 'fulfilled' ? onlineOrdersResult.value : [];
  const reservations = reservationsResult.status === 'fulfilled' ? reservationsResult.value : [];

  const lowStockItems = safeStockItems.filter((item) => Number(item.quantity) <= Number(item.reorderLevel)).slice(0, 8);

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: safeTopItems.map((item) => item.menuItemId) } },
    select: { id: true, name: true }
  });
  const nameById = Object.fromEntries(menuItems.map((item) => [item.id, item.name]));

  res.json({
    dailySales: sumDecimal(safeDailySales, 'total'),
    monthlySales: sumDecimal(safeMonthlySales, 'total'),
    monthlyExpenses: sumDecimal(safeMonthlyExpenses, 'amount'),
    monthlyProfit: sumDecimal(safeMonthlySales, 'total') - sumDecimal(safeMonthlyExpenses, 'amount'),
    lowStockCount: lowStockItems.length,
    lowStockItems,
    stockItems: safeStockItems.slice(0, 12),
    onlineOrdersCount: onlineOrders.length,
    onlineOrdersTotal: sumDecimal(onlineOrders, 'total'),
    reservationsToday: reservations.length,
    recentSales: safeRecentSales,
    topItems: safeTopItems.map((item) => ({
      menuItemId: item.menuItemId,
      name: nameById[item.menuItemId] || 'Menu item',
      quantity: item._sum.quantity || 0,
      total: Number(item._sum.total || 0)
    }))
  });
});
