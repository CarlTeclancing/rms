import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginatedResponse } from '../utils/pagination.js';

const select = { id: true, name: true, email: true, status: true, role: true, createdAt: true };

export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const [items, total] = await Promise.all([
    prisma.user.findMany({ select, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.user.count()
  ]);
  res.json(paginatedResponse(items, total, page, limit));
});

export const createUser = asyncHandler(async (req, res) => {
  const { password, ...data } = req.body;
  const user = await prisma.user.create({
    data: { ...data, passwordHash: await bcrypt.hash(password, 12) },
    select
  });
  res.status(201).json(user);
});

export const updateUser = asyncHandler(async (req, res) => {
  const { password, ...data } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { ...data, ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}) },
    select
  });
  res.json(user);
});

export const deleteUser = asyncHandler(async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export const listRoles = asyncHandler(async (_req, res) => {
  res.json(await prisma.role.findMany({ orderBy: { name: 'asc' } }));
});

export const createRole = asyncHandler(async (req, res) => {
  const role = await prisma.role.create({ data: req.body });
  res.status(201).json(role);
});
