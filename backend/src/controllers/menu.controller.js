import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPagination, paginatedResponse } from '../utils/pagination.js';

const include = {
  category: true,
  recipeIngredients: { include: { ingredient: true } }
};

export const listMenuItems = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const search = req.query.search?.trim();
  const where = {
    ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    ...(req.query.categoryId ? { categoryId: req.query.categoryId } : {})
  };
  const [items, total] = await Promise.all([
    prisma.menuItem.findMany({ where, include, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.menuItem.count({ where })
  ]);
  res.json(paginatedResponse(items, total, page, limit));
});

export const createMenuItem = asyncHandler(async (req, res) => {
  const { recipeIngredients = [], ...data } = req.body;
  const variations = Array.isArray(data.variations)
    ? data.variations
        .filter((variation) => variation?.name)
        .map((variation) => ({ name: variation.name.trim(), price: Number(variation.price || data.price || 0) }))
    : [];
  const item = await prisma.menuItem.create({
    data: {
      ...data,
      price: Number(data.price),
      variations,
      recipeIngredients: {
        create: recipeIngredients.map((ingredient) => ({
          ingredientId: ingredient.ingredientId,
          quantity: Number(ingredient.quantity)
        }))
      }
    },
    include
  });
  res.status(201).json(item);
});

export const updateMenuItem = asyncHandler(async (req, res) => {
  const { recipeIngredients, ...data } = req.body;
  const variations = Array.isArray(data.variations)
    ? data.variations
        .filter((variation) => variation?.name)
        .map((variation) => ({ name: variation.name.trim(), price: Number(variation.price || data.price || 0) }))
    : undefined;
  const item = await prisma.$transaction(async (tx) => {
    if (recipeIngredients) {
      await tx.recipeIngredient.deleteMany({ where: { menuItemId: req.params.id } });
    }
    return tx.menuItem.update({
      where: { id: req.params.id },
      data: {
        ...data,
        ...(data.price !== undefined ? { price: Number(data.price) } : {}),
        ...(variations !== undefined ? { variations } : {}),
        ...(recipeIngredients
          ? {
              recipeIngredients: {
                create: recipeIngredients.map((ingredient) => ({
                  ingredientId: ingredient.ingredientId,
                  quantity: Number(ingredient.quantity)
                }))
              }
            }
          : {})
      },
      include
    });
  });
  res.json(item);
});

export const deleteMenuItem = asyncHandler(async (req, res) => {
  await prisma.menuItem.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export const listMenuCategories = asyncHandler(async (_req, res) => {
  res.json(await prisma.menuCategory.findMany({ orderBy: { name: 'asc' } }));
});

export const createMenuCategory = asyncHandler(async (req, res) => {
  const category = await prisma.menuCategory.create({ data: req.body });
  res.status(201).json(category);
});

export const listIngredients = asyncHandler(async (_req, res) => {
  res.json(await prisma.ingredient.findMany({ orderBy: { name: 'asc' } }));
});

export const ensureMenuItem = async (id) => {
  const item = await prisma.menuItem.findUnique({ where: { id }, include });
  if (!item) throw new ApiError(404, 'Menu item not found');
  return item;
};
