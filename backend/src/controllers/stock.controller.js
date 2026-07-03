import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginatedResponse } from '../utils/pagination.js';

export const listStockItems = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const search = req.query.search?.trim();
  const where = search ? { name: { contains: search, mode: 'insensitive' } } : {};
  const [items, total] = await Promise.all([
    prisma.stockItem.findMany({
      where,
      include: { ingredient: true, supplier: true },
      skip,
      take: limit,
      orderBy: { name: 'asc' }
    }),
    prisma.stockItem.count({ where })
  ]);
  res.json(paginatedResponse(items, total, page, limit));
});

export const createStockItem = asyncHandler(async (req, res) => {
  const item = await prisma.stockItem.create({
    data: {
      ...req.body,
      quantity: Number(req.body.quantity || 0),
      reorderLevel: Number(req.body.reorderLevel || 0),
      unitCost: Number(req.body.unitCost || 0)
    },
    include: { ingredient: true, supplier: true }
  });
  res.status(201).json(item);
});

export const updateStockItem = asyncHandler(async (req, res) => {
  const item = await prisma.stockItem.update({
    where: { id: req.params.id },
    data: {
      ...req.body,
      ...(req.body.quantity !== undefined ? { quantity: Number(req.body.quantity) } : {}),
      ...(req.body.reorderLevel !== undefined ? { reorderLevel: Number(req.body.reorderLevel) } : {}),
      ...(req.body.unitCost !== undefined ? { unitCost: Number(req.body.unitCost) } : {})
    },
    include: { ingredient: true, supplier: true }
  });
  res.json(item);
});

export const deleteStockItem = asyncHandler(async (req, res) => {
  await prisma.stockItem.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export const createStockMovement = asyncHandler(async (req, res) => {
  const quantity = Number(req.body.quantity);
  const movement = await prisma.$transaction(async (tx) => {
    const current = await tx.stockItem.findUnique({ where: { id: req.body.stockItemId } });
    if (!current) throw new ApiError(404, 'Stock item not found');
    const nextQuantity = req.body.type === 'OUT' ? Number(current.quantity) - quantity : Number(current.quantity) + quantity;
    await tx.stockItem.update({ where: { id: current.id }, data: { quantity: nextQuantity } });
    return tx.stockMovement.create({
      data: { stockItemId: current.id, type: req.body.type, quantity, note: req.body.note }
    });
  });
  res.status(201).json(movement);
});

export const listStockMovements = asyncHandler(async (_req, res) => {
  const movements = await prisma.stockMovement.findMany({
    include: { stockItem: true },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  res.json({ items: movements });
});

export const listSuppliers = asyncHandler(async (_req, res) => {
  res.json(await prisma.supplier.findMany({ orderBy: { name: 'asc' } }));
});
