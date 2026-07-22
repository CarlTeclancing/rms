import { prisma } from '../config/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const defaultSettings = {
  restaurantName: 'ChopASAP',
  shortName: 'ChopASAP',
  currency: 'XAF',
  deliveryFee: 1000,
  publicOrdering: true,
  reservations: true,
  supportPhone: '+237671286999'
};

const serializeSettings = (settings) => ({
  ...defaultSettings,
  ...settings,
  deliveryFee: Number(settings?.deliveryFee ?? defaultSettings.deliveryFee)
});

export const getSettings = asyncHandler(async (_req, res) => {
  const settings = await prisma.appSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: defaultSettings
  });

  res.json(serializeSettings(settings));
});

export const updateSettings = asyncHandler(async (req, res) => {
  const allowed = ['restaurantName', 'shortName', 'currency', 'deliveryFee', 'publicOrdering', 'reservations', 'supportPhone'];
  const data = {};

  for (const key of allowed) {
    if (req.body[key] !== undefined) data[key] = req.body[key];
  }

  if (data.deliveryFee !== undefined) data.deliveryFee = Number(data.deliveryFee || 0);

  const settings = await prisma.appSettings.upsert({
    where: { id: 'default' },
    update: data,
    create: { ...defaultSettings, ...data }
  });

  res.json(serializeSettings(settings));
});
