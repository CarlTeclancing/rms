import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginatedResponse } from '../utils/pagination.js';

export const listExpenses = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const where = req.query.categoryId ? { categoryId: req.query.categoryId } : {};
  const [items, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { category: true, supplier: true, user: { select: { name: true } } },
      skip,
      take: limit,
      orderBy: { expenseDate: 'desc' }
    }),
    prisma.expense.count({ where })
  ]);
  res.json(paginatedResponse(items, total, page, limit));
});

export const createExpense = asyncHandler(async (req, res) => {
  const expense = await prisma.expense.create({
    data: {
      ...req.body,
      amount: Number(req.body.amount),
      userId: req.user.id,
      expenseDate: req.body.expenseDate ? new Date(req.body.expenseDate) : new Date()
    },
    include: { category: true, supplier: true }
  });
  res.status(201).json(expense);
});

export const updateExpense = asyncHandler(async (req, res) => {
  const expense = await prisma.expense.update({
    where: { id: req.params.id },
    data: {
      ...req.body,
      ...(req.body.amount !== undefined ? { amount: Number(req.body.amount) } : {}),
      ...(req.body.expenseDate ? { expenseDate: new Date(req.body.expenseDate) } : {})
    }
  });
  res.json(expense);
});

export const deleteExpense = asyncHandler(async (req, res) => {
  await prisma.expense.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export const listExpenseCategories = asyncHandler(async (_req, res) => {
  res.json(await prisma.expenseCategory.findMany({ orderBy: { name: 'asc' } }));
});

export const createExpenseCategory = asyncHandler(async (req, res) => {
  const category = await prisma.expenseCategory.create({
    data: {
      name: req.body.name,
      description: req.body.description || null
    }
  });

  res.status(201).json(category);
});
