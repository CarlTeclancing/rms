import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginatedResponse } from '../utils/pagination.js';

const include = { recordedBy: { select: { id: true, name: true } } };

const normalizeStatus = (amount, amountPaid, status) => {
  if (status === 'CANCELLED') return 'CANCELLED';
  const paid = Number(amountPaid || 0);
  const total = Number(amount || 0);
  if (paid <= 0) return 'OPEN';
  if (paid >= total) return 'PAID';
  return 'PARTIALLY_PAID';
};

const debtorData = (body, userId) => {
  const amount = Number(body.amount || 0);
  const amountPaid = Number(body.amountPaid || 0);
  const data = {
    customerName: body.customerName,
    phone: body.phone || null,
    description: body.description,
    amount,
    amountPaid,
    status: normalizeStatus(amount, amountPaid, body.status),
    dueDate: body.dueDate ? new Date(body.dueDate) : null
  };
  if (userId) data.recordedById = userId;
  return data;
};

const debtorUpdateData = (body) => {
  const data = {};
  for (const key of ['customerName', 'description', 'status']) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (body.phone !== undefined) data.phone = body.phone || null;
  if (body.amount !== undefined) data.amount = Number(body.amount || 0);
  if (body.amountPaid !== undefined) data.amountPaid = Number(body.amountPaid || 0);
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.amount !== undefined || body.amountPaid !== undefined || body.status !== undefined) {
    data.status = normalizeStatus(data.amount ?? body.currentAmount, data.amountPaid ?? body.currentAmountPaid, data.status);
  }
  return data;
};

export const listDebtors = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const search = req.query.search?.trim();
  const where = {
    ...(req.query.status ? { status: req.query.status } : {}),
    ...(search
      ? {
          OR: [
            { customerName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        }
      : {})
  };
  const [items, total] = await Promise.all([
    prisma.debtor.findMany({ where, include, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.debtor.count({ where })
  ]);
  const totalOutstanding = await prisma.debtor.aggregate({
    where: { status: { in: ['OPEN', 'PARTIALLY_PAID'] } },
    _sum: { amount: true, amountPaid: true }
  });
  res.json({
    ...paginatedResponse(items, total, page, limit),
    outstanding: Number(totalOutstanding._sum.amount || 0) - Number(totalOutstanding._sum.amountPaid || 0)
  });
});

export const createDebtor = asyncHandler(async (req, res) => {
  const debtor = await prisma.debtor.create({
    data: debtorData(req.body, req.user.id),
    include
  });
  res.status(201).json(debtor);
});

export const updateDebtor = asyncHandler(async (req, res) => {
  const current = await prisma.debtor.findUnique({ where: { id: req.params.id } });
  const debtor = await prisma.debtor.update({
    where: { id: req.params.id },
    data: debtorUpdateData({
      ...req.body,
      currentAmount: current?.amount,
      currentAmountPaid: current?.amountPaid
    }),
    include
  });
  res.json(debtor);
});

export const deleteDebtor = asyncHandler(async (req, res) => {
  await prisma.debtor.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
