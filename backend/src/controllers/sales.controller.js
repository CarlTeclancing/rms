import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginatedResponse } from '../utils/pagination.js';
import { applyStockDeductions, buildSaleRowsAndDeductions } from '../services/stock.service.js';

const saleInclude = {
  user: { select: { id: true, name: true } },
  saleItems: { include: { menuItem: true } },
  payments: true
};

export const listSales = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const [items, total] = await Promise.all([
    prisma.sale.findMany({ include: saleInclude, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.sale.count()
  ]);
  res.json(paginatedResponse(items, total, page, limit));
});

export const createSale = asyncHandler(async (req, res) => {
  const { items, paymentMethod = 'CASH', amountPaid, discount = 0, tax = 0 } = req.body;
  if (!items?.length) throw new ApiError(422, 'At least one sale item is required');

  const sale = await prisma.$transaction(async (tx) => {
    const { itemRows, deductions } = await buildSaleRowsAndDeductions(tx, items);

    const subtotal = itemRows.reduce((sum, item) => sum + item.total, 0);
    const total = subtotal + Number(tax) - Number(discount);

    const created = await tx.sale.create({
      data: {
        orderNo: `ORD-${Date.now()}`,
        userId: req.user.id,
        subtotal,
        tax: Number(tax),
        discount: Number(discount),
        total,
        saleItems: {
          create: itemRows.map((row) => ({
            menuItemId: row.menuItem.id,
            quantity: row.quantity,
            unitPrice: row.unitPrice,
            total: row.total
          }))
        },
        payments: {
          create: {
            method: paymentMethod,
            amount: Number(amountPaid || total)
          }
        }
      },
      include: saleInclude
    });

    await applyStockDeductions(tx, deductions, `Sale ${created.orderNo}`);

    return created;
  });

  res.status(201).json(sale);
});
