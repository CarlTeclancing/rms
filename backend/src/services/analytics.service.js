const toNumber = (value) => Number(value || 0);

const dateRange = (query = {}) => ({
  from: query.from ? new Date(query.from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  to: query.to ? new Date(query.to) : new Date()
});

const sum = (rows, selector) => rows.reduce((total, row) => total + toNumber(selector(row)), 0);

const daysBetween = (from, to) => Math.max(1, Math.ceil((to - from) / 86400000) + 1);

const money = (value) => Math.round(toNumber(value) * 100) / 100;

const recipeCost = (menuItem) =>
  sum(menuItem.recipeIngredients || [], (ingredient) => {
    const unitCost = ingredient.ingredient?.stockItem?.unitCost || 0;
    return toNumber(ingredient.quantity) * toNumber(unitCost);
  });

const groupByDay = (sales) => {
  const grouped = {};
  for (const sale of sales) {
    const key = sale.createdAt.toISOString().slice(0, 10);
    grouped[key] = (grouped[key] || 0) + toNumber(sale.total);
  }
  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, total]) => ({ date, total: money(total) }));
};

const buildRecommendation = ({ problem, priority, supportingData, impact, likelyCause, action, department = 'Restaurant', type }) => ({
  id: `${type}-${problem}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  problem,
  department,
  priority,
  supportingData,
  financialImpact: impact,
  likelyCause,
  recommendedAction: action,
  status: 'NEW',
  detectedAt: new Date().toISOString()
});

export async function buildBusinessIntelligence(prisma, query = {}) {
  const { from, to } = dateRange(query);
  const previousDays = daysBetween(from, to);
  const previousFrom = new Date(from);
  previousFrom.setDate(previousFrom.getDate() - previousDays);

  const [sales, previousSales, expenses, previousExpenses, stockItems, saleItems] = await Promise.all([
    prisma.sale.findMany({
      where: { createdAt: { gte: from, lte: to }, status: 'COMPLETED' },
      include: {
        payments: true,
        saleItems: {
          include: {
            menuItem: {
              include: {
                category: true,
                recipeIngredients: { include: { ingredient: { include: { stockItem: true } } } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.sale.findMany({ where: { createdAt: { gte: previousFrom, lt: from }, status: 'COMPLETED' } }),
    prisma.expense.findMany({
      where: { expenseDate: { gte: from, lte: to } },
      include: { category: true, supplier: true },
      orderBy: { expenseDate: 'desc' }
    }),
    prisma.expense.findMany({ where: { expenseDate: { gte: previousFrom, lt: from } } }),
    prisma.stockItem.findMany({ include: { supplier: true }, orderBy: { quantity: 'asc' } }),
    prisma.saleItem.findMany({
      where: { sale: { createdAt: { gte: from, lte: to }, status: 'COMPLETED' } },
      include: {
        menuItem: {
          include: {
            category: true,
            recipeIngredients: { include: { ingredient: { include: { stockItem: true } } } }
          }
        }
      }
    })
  ]);

  const totalSales = sum(sales, (sale) => sale.total);
  const totalExpenses = sum(expenses, (expense) => expense.amount);
  const previousSalesTotal = sum(previousSales, (sale) => sale.total);
  const previousExpenseTotal = sum(previousExpenses, (expense) => expense.amount);

  const productRows = {};
  for (const item of saleItems) {
    const unitCost = recipeCost(item.menuItem);
    const key = item.menuItemId;
    if (!productRows[key]) {
      productRows[key] = {
        id: key,
        name: item.menuItem.name,
        category: item.menuItem.category?.name || 'Uncategorised',
        unitsSold: 0,
        revenue: 0,
        cogs: 0
      };
    }
    productRows[key].unitsSold += item.quantity;
    productRows[key].revenue += toNumber(item.total);
    productRows[key].cogs += item.quantity * unitCost;
  }

  const productProfitability = Object.values(productRows)
    .map((product) => {
      const grossProfit = product.revenue - product.cogs;
      const grossMargin = product.revenue > 0 ? (grossProfit / product.revenue) * 100 : 0;
      const highSales = product.unitsSold >= Math.max(2, saleItems.length / Math.max(1, Object.keys(productRows).length));
      const highProfit = grossMargin >= 60;
      return {
        ...product,
        revenue: money(product.revenue),
        cogs: money(product.cogs),
        grossProfit: money(grossProfit),
        grossMargin: money(grossMargin),
        classification: highSales && highProfit ? 'Star' : highSales ? 'Plowhorse' : highProfit ? 'Puzzle' : 'Dog'
      };
    })
    .sort((a, b) => b.grossProfit - a.grossProfit);

  const cogs = sum(productProfitability, (product) => product.cogs);
  const grossProfit = totalSales - cogs;
  const netProfit = grossProfit - totalExpenses;
  const grossMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
  const netMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
  const foodCostPercentage = totalSales > 0 ? (cogs / totalSales) * 100 : 0;
  const expenseToSalesRatio = totalSales > 0 ? (totalExpenses / totalSales) * 100 : 0;
  const salesGrowth = previousSalesTotal > 0 ? ((totalSales - previousSalesTotal) / previousSalesTotal) * 100 : 0;
  const expenseGrowth = previousExpenseTotal > 0 ? ((totalExpenses - previousExpenseTotal) / previousExpenseTotal) * 100 : 0;
  const inventoryValue = sum(stockItems, (item) => toNumber(item.quantity) * toNumber(item.unitCost));
  const lowStockItems = stockItems.filter((item) => toNumber(item.quantity) <= toNumber(item.reorderLevel));
  const negativeStockItems = stockItems.filter((item) => toNumber(item.quantity) < 0);
  const dailyTrend = groupByDay(sales);
  const averageDailySales = totalSales / daysBetween(from, to);
  const forecast = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(to);
    date.setDate(date.getDate() + index + 1);
    const confidence = averageDailySales * 0.18;
    return {
      date: date.toISOString().slice(0, 10),
      expected: money(averageDailySales),
      bestCase: money(averageDailySales + confidence),
      worstCase: money(Math.max(0, averageDailySales - confidence)),
      assumption: 'Moving average based on completed sales in the selected period.'
    };
  });

  const expensesByCategory = Object.values(
    expenses.reduce((acc, expense) => {
      const key = expense.category?.name || 'Uncategorised';
      acc[key] ||= { category: key, amount: 0, count: 0 };
      acc[key].amount += toNumber(expense.amount);
      acc[key].count += 1;
      return acc;
    }, {})
  )
    .map((row) => ({ ...row, amount: money(row.amount) }))
    .sort((a, b) => b.amount - a.amount);

  const recommendations = [];
  if (foodCostPercentage > 35) {
    recommendations.push(buildRecommendation({
      type: 'food-cost',
      problem: 'High food cost percentage',
      priority: foodCostPercentage > 45 ? 'CRITICAL' : 'HIGH',
      supportingData: `${money(foodCostPercentage)}% food cost against ${money(totalSales)} sales`,
      impact: money(cogs),
      likelyCause: 'Recipe prices, portion control, wastage, or supplier cost increases.',
      action: 'Review recipe quantities, compare supplier prices, and adjust menu prices for low-margin products.'
    }));
  }
  if (expenseToSalesRatio > 45) {
    recommendations.push(buildRecommendation({
      type: 'expense-ratio',
      problem: 'Expenses are high relative to sales',
      priority: expenseToSalesRatio > 65 ? 'CRITICAL' : 'HIGH',
      supportingData: `${money(expenseToSalesRatio)}% expense-to-sales ratio`,
      impact: money(totalExpenses),
      likelyCause: 'Operating expenses are growing faster than revenue.',
      action: 'Review the largest expense categories and require approval for non-essential spending.'
    }));
  }
  if (netProfit < 0) {
    recommendations.push(buildRecommendation({
      type: 'negative-profit',
      problem: 'Negative net profit',
      priority: 'CRITICAL',
      supportingData: `${money(netProfit)} net profit`,
      impact: money(Math.abs(netProfit)),
      likelyCause: 'Sales are not covering product costs and operating expenses.',
      action: 'Reduce controllable expenses, lift high-demand prices, and promote high-margin products.'
    }));
  }
  for (const product of productProfitability.filter((item) => item.classification === 'Plowhorse' || item.classification === 'Dog').slice(0, 5)) {
    recommendations.push(buildRecommendation({
      type: `product-${product.id}`,
      problem: `${product.name} has weak profitability`,
      priority: product.grossMargin < 25 ? 'HIGH' : 'MEDIUM',
      supportingData: `${product.unitsSold} sold at ${product.grossMargin}% gross margin`,
      impact: money(product.grossProfit),
      likelyCause: 'Selling price is too low for the current recipe cost or demand is weak.',
      action: product.classification === 'Plowhorse' ? 'Increase price carefully or reduce ingredient cost.' : 'Redesign, promote selectively, or remove from the menu.'
    }));
  }
  if (lowStockItems.length) {
    recommendations.push(buildRecommendation({
      type: 'low-stock',
      problem: 'Low stock items need replenishment',
      priority: negativeStockItems.length ? 'CRITICAL' : 'MEDIUM',
      supportingData: `${lowStockItems.length} items are at or below reorder level`,
      impact: money(sum(lowStockItems, (item) => Math.max(0, toNumber(item.reorderLevel) - toNumber(item.quantity)) * toNumber(item.unitCost))),
      likelyCause: 'Stock usage or sales consumption is outpacing purchasing.',
      action: 'Create purchase orders for critical ingredients and check recent stock deductions.'
    }));
  }

  const alerts = [
    ...lowStockItems.map((item) => ({
      id: `low-stock-${item.id}`,
      type: 'LOW_STOCK',
      severity: toNumber(item.quantity) < 0 ? 'CRITICAL' : 'WARNING',
      title: `${item.name} is below reorder level`,
      message: `${toNumber(item.quantity)} ${item.unit} on hand; reorder at ${toNumber(item.reorderLevel)} ${item.unit}.`,
      status: 'NEW'
    })),
    ...productProfitability
      .filter((product) => product.grossMargin < 25 && product.revenue > 0)
      .slice(0, 5)
      .map((product) => ({
        id: `low-margin-${product.id}`,
        type: 'LOW_MARGIN',
        severity: product.grossMargin < 0 ? 'CRITICAL' : 'WARNING',
        title: `${product.name} margin is low`,
        message: `${product.grossMargin}% gross margin from ${money(product.revenue)} revenue.`,
        status: 'NEW'
      }))
  ];

  const fixedCosts = sum(expenses.filter((expense) => ['Rent', 'Payroll', 'Utilities'].includes(expense.category?.name)), (expense) => expense.amount);
  const variableCosts = Math.max(0, cogs + totalExpenses - fixedCosts);
  const contributionMarginPercentage = totalSales > 0 ? ((totalSales - variableCosts) / totalSales) * 100 : 0;
  const breakEvenSales = contributionMarginPercentage > 0 ? fixedCosts / (contributionMarginPercentage / 100) : 0;

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    summary: {
      totalSales: money(totalSales),
      totalExpenses: money(totalExpenses),
      cogs: money(cogs),
      grossProfit: money(grossProfit),
      netProfit: money(netProfit),
      grossMargin: money(grossMargin),
      netMargin: money(netMargin),
      foodCostPercentage: money(foodCostPercentage),
      expenseToSalesRatio: money(expenseToSalesRatio),
      salesGrowth: money(salesGrowth),
      expenseGrowth: money(expenseGrowth),
      averageTransactionValue: money(totalSales / Math.max(1, sales.length)),
      inventoryValue: money(inventoryValue),
      lowStockCount: lowStockItems.length,
      unresolvedRecommendations: recommendations.length,
      breakEvenSales: money(breakEvenSales),
      marginOfSafety: money(totalSales - breakEvenSales)
    },
    charts: {
      dailySales: dailyTrend,
      expensesByCategory,
      productProfitability: productProfitability.slice(0, 10)
    },
    cashFlow: {
      openingCashBalance: 0,
      inflows: money(totalSales),
      outflows: money(totalExpenses),
      netCashMovement: money(totalSales - totalExpenses),
      closingCashBalance: money(totalSales - totalExpenses),
      note: 'Cash flow is based on recorded sales and expenses in this period.'
    },
    profitLoss: {
      grossSales: money(totalSales),
      discounts: money(sum(sales, (sale) => sale.discount)),
      netSales: money(totalSales),
      costOfGoodsSold: money(cogs),
      grossProfit: money(grossProfit),
      operatingExpenses: money(totalExpenses),
      operatingProfit: money(netProfit),
      netProfit: money(netProfit),
      netMargin: money(netMargin)
    },
    breakEven: {
      fixedCosts: money(fixedCosts),
      variableCosts: money(variableCosts),
      contributionMarginPercentage: money(contributionMarginPercentage),
      breakEvenSales: money(breakEvenSales),
      currentSales: money(totalSales),
      marginOfSafety: money(totalSales - breakEvenSales),
      requiredDailySales: money(breakEvenSales / daysBetween(from, to))
    },
    productProfitability,
    forecast,
    recommendations,
    alerts
  };
}

export function businessIntelligenceCsv(data) {
  const lines = [
    ['Business Intelligence Report'],
    ['Period', data.period.from, data.period.to],
    [],
    ['Metric', 'Value'],
    ...Object.entries(data.summary).map(([key, value]) => [key, value]),
    [],
    ['Product', 'Units Sold', 'Revenue', 'COGS', 'Gross Profit', 'Gross Margin', 'Classification'],
    ...data.productProfitability.map((row) => [row.name, row.unitsSold, row.revenue, row.cogs, row.grossProfit, `${row.grossMargin}%`, row.classification]),
    [],
    ['Recommendation', 'Priority', 'Supporting Data', 'Recommended Action'],
    ...data.recommendations.map((row) => [row.problem, row.priority, row.supportingData, row.recommendedAction])
  ];
  return lines.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
}

const escapePdfText = (value) => String(value ?? '').replace(/[\\()]/g, '\\$&').replace(/[^\x20-\x7E]/g, '');

export function businessIntelligencePdf(data) {
  const reportLines = [
    'Business Intelligence Report',
    `${data.period.from.slice(0, 10)} to ${data.period.to.slice(0, 10)}`,
    '',
    `Total sales: ${data.summary.totalSales}`,
    `Total expenses: ${data.summary.totalExpenses}`,
    `COGS: ${data.summary.cogs}`,
    `Gross profit: ${data.summary.grossProfit}`,
    `Net profit: ${data.summary.netProfit}`,
    `Gross margin: ${data.summary.grossMargin}%`,
    `Net margin: ${data.summary.netMargin}%`,
    `Food cost: ${data.summary.foodCostPercentage}%`,
    `Break-even sales: ${data.summary.breakEvenSales}`,
    '',
    'Recommendations',
    ...(data.recommendations.length
      ? data.recommendations.slice(0, 8).map((item) => `${item.priority}: ${item.problem} - ${item.recommendedAction}`)
      : ['No recommendations for this period.']),
    '',
    'Forecasts are estimates based on historical data.'
  ];

  const content = [
    'BT',
    '/F1 18 Tf',
    '50 780 Td',
    `(${escapePdfText(reportLines[0])}) Tj`,
    '/F1 10 Tf',
    ...reportLines.slice(1).flatMap((line) => ['0 -18 Td', `(${escapePdfText(line).slice(0, 95)}) Tj`]),
    'ET'
  ].join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf);
}
