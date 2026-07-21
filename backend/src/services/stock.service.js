import { ApiError } from '../utils/apiError.js';

export const buildSaleRowsAndDeductions = async (tx, items) => {
  const menuItems = await tx.menuItem.findMany({
    where: { id: { in: items.map((item) => item.menuItemId) }, isAvailable: true },
    include: { recipeIngredients: { include: { ingredient: { include: { stockItem: true } } } } }
  });

  if (menuItems.length !== items.length) throw new ApiError(422, 'One or more menu items are invalid or unavailable');

  const itemRows = items.map((item) => {
    const menuItem = menuItems.find((entry) => entry.id === item.menuItemId);
    const quantity = Number(item.quantity);
    const variations = Array.isArray(menuItem.variations) ? menuItem.variations : [];
    const variation = item.variationName ? variations.find((entry) => entry.name === item.variationName) : null;
    const unitPrice = variation ? Number(variation.price) : Number(menuItem.price);
    return { menuItem, variationName: variation?.name || null, quantity, unitPrice, total: unitPrice * quantity };
  });

  const deductions = new Map();
  for (const row of itemRows) {
    for (const recipe of row.menuItem.recipeIngredients) {
      const stockItem = recipe.ingredient.stockItem;
      if (!stockItem) continue;
      const required = Number(recipe.quantity) * row.quantity;
      const currentRequired = deductions.get(stockItem.id)?.quantity || 0;
      const nextRequired = currentRequired + required;
      if (Number(stockItem.quantity) < nextRequired) {
        throw new ApiError(409, `Insufficient stock for ${stockItem.name}`);
      }
      deductions.set(stockItem.id, { stockItem, quantity: nextRequired });
    }
  }

  return { itemRows, deductions };
};

export const applyStockDeductions = async (tx, deductions, note) => {
  for (const { stockItem, quantity } of deductions.values()) {
    await tx.stockItem.update({
      where: { id: stockItem.id },
      data: { quantity: Number(stockItem.quantity) - quantity }
    });
    await tx.stockMovement.create({
      data: { stockItemId: stockItem.id, type: 'SALE', quantity, note }
    });
  }
};
