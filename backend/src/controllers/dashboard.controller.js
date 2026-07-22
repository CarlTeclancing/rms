import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const sumDecimal = (rows, field) => rows.reduce((sum, row) => sum + Number(row[field] || 0), 0);
const optionalFindMany = (delegate, args) => (delegate?.findMany ? delegate.findMany(args).catch(() => []) : Promise.resolve([]));
const combineTopItems = (saleItems, onlineItems) => {
  const totals = new Map();

  for (const item of saleItems) {
    totals.set(item.menuItemId, {
      menuItemId: item.menuItemId,
      quantity: Number(item._sum.quantity || 0),
      total: Number(item._sum.total || 0)
    });
  }

  for (const item of onlineItems) {
    const current = totals.get(item.menuItemId) || { menuItemId: item.menuItemId, quantity: 0, total: 0 };
    totals.set(item.menuItemId, {
      ...current,
      quantity: current.quantity + Number(item._sum.quantity || 0),
      total: current.total + Number(item._sum.total || 0)
    });
  }

  return [...totals.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
};

export const getStats = asyncHandler(async (_req, res) => {
  const now = new Date();
  const today = startOfDay(now);
  const month = startOfMonth(now);

  const [
    dailySales,
    monthlySales,
    monthlyExpenses,
    stockItems,
    recentSales,
    topItems,
    topOnlineItems,
    onlineOrdersResult,
    dailyOnlineOrdersResult,
    reservationsResult
  ] = await Promise.allSettled([
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
    prisma.onlineOrderItem.groupBy({
      by: ['menuItemId'],
      where: { onlineOrder: { createdAt: { gte: month }, status: { not: 'CANCELLED' } } },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    }),
    optionalFindMany(prisma.onlineOrder, { where: { createdAt: { gte: month }, status: { not: 'CANCELLED' } } }),
    optionalFindMany(prisma.onlineOrder, { where: { createdAt: { gte: today }, status: { not: 'CANCELLED' } } }),
    optionalFindMany(prisma.reservation, { where: { reservationAt: { gte: today } } })
  ]);

  const settled = [dailySales, monthlySales, monthlyExpenses, stockItems, recentSales, topItems, topOnlineItems].map((result) => {
    if (result.status === 'rejected') throw result.reason;
    return result.value;
  });
  const [safeDailySales, safeMonthlySales, safeMonthlyExpenses, safeStockItems, safeRecentSales, safeTopItems, safeTopOnlineItems] = settled;
  const onlineOrders = onlineOrdersResult.status === 'fulfilled' ? onlineOrdersResult.value : [];
  const dailyOnlineOrders = dailyOnlineOrdersResult.status === 'fulfilled' ? dailyOnlineOrdersResult.value : [];
  const reservations = reservationsResult.status === 'fulfilled' ? reservationsResult.value : [];
  const dailyPosSalesTotal = sumDecimal(safeDailySales, 'total');
  const monthlyPosSalesTotal = sumDecimal(safeMonthlySales, 'total');
  const dailyOnlineOrdersTotal = sumDecimal(dailyOnlineOrders, 'total');
  const onlineOrdersTotal = sumDecimal(onlineOrders, 'total');
  const monthlyExpensesTotal = sumDecimal(safeMonthlyExpenses, 'amount');
  const combinedTopItems = combineTopItems(safeTopItems, safeTopOnlineItems);

  const lowStockItems = safeStockItems.filter((item) => Number(item.quantity) <= Number(item.reorderLevel)).slice(0, 8);

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: combinedTopItems.map((item) => item.menuItemId) } },
    select: { id: true, name: true }
  });
  const nameById = Object.fromEntries(menuItems.map((item) => [item.id, item.name]));

  res.json({
    dailySales: dailyPosSalesTotal + dailyOnlineOrdersTotal,
    monthlySales: monthlyPosSalesTotal + onlineOrdersTotal,
    posDailySales: dailyPosSalesTotal,
    posMonthlySales: monthlyPosSalesTotal,
    dailyOnlineOrdersTotal,
    monthlyExpenses: monthlyExpensesTotal,
    monthlyProfit: monthlyPosSalesTotal + onlineOrdersTotal - monthlyExpensesTotal,
    lowStockCount: lowStockItems.length,
    lowStockItems,
    stockItems: safeStockItems.slice(0, 12),
    onlineOrdersCount: onlineOrders.length,
    onlineOrdersTotal,
    reservationsToday: reservations.length,
    recentSales: safeRecentSales,
    topItems: combinedTopItems.map((item) => ({
      menuItemId: item.menuItemId,
      name: nameById[item.menuItemId] || 'Menu item',
      quantity: item.quantity,
      total: item.total
    }))
  });
});
