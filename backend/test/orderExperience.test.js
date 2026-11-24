import test from 'node:test';
import assert from 'node:assert/strict';
import { validateOrderInput, configuredDeliveryFee, orderIdentity } from '../src/services/orderValidation.service.js';
import { buildSaleRowsAndDeductions, applyStockDeductions } from '../src/services/stock.service.js';
import { savedOrderMessage, orderWhatsAppUrl } from '../../shared/orderExperience.js';
import { signCustomerSession, readCustomerSession, customerSession } from '../src/middleware/customerSession.js';

const body = () => ({ customerName: 'Test buyer', customerPhone: '+237600000000', deliveryAddress: 'Test address', fulfillment: 'delivery', requestId: 'test-request-123456789', items: [{ menuItemId: 'meal-1', quantity: 2 }] });
const meal = { id: 'meal-1', name: 'Rice', price: 1500, variations: [{ name: 'Large', price: 2000 }], recipeIngredients: [] };

test('rejects empty carts, invalid quantities and coordinates', () => {
  assert.doesNotThrow(() => validateOrderInput(body()));
  for (const quantity of [0, -1, 1.5, 100, NaN, '2']) assert.throws(() => validateOrderInput({ ...body(), items: [{ menuItemId: 'meal-1', quantity }] }));
  assert.throws(() => validateOrderInput({ ...body(), items: [] }));
  assert.throws(() => validateOrderInput({ ...body(), latitude: 91 }));
  assert.throws(() => validateOrderInput({ ...body(), isGift: true, recipientName: 123, recipientPhone: '600000000' }), { statusCode: 422 });
});

test('fees come from administrator settings, not client totals', () => {
  assert.equal(configuredDeliveryFee({ ...body(), deliveryFee: -10000 }, { deliveryFee: 500 }), 500);
  assert.equal(configuredDeliveryFee({ ...body(), fulfillment: 'onsite' }, { deliveryFee: 500 }), 0);
  assert.equal(configuredDeliveryFee({ deliveryAddress: 'Reserve onsite' }, { deliveryFee: 500 }), 0);
});

test('retries share one reference and changed order content has a different fingerprint', () => {
  assert.deepEqual(orderIdentity(body()), orderIdentity(body()));
  const changed = orderIdentity({ ...body(), deliveryNote: 'No pepper' });
  assert.equal(changed.orderNo, orderIdentity(body()).orderNo);
  assert.notEqual(changed.fingerprint, orderIdentity(body()).fingerprint);
});

test('uses database prices, allows two portions of the same meal, rejects invalid options', async () => {
  const tx = { menuItem: { findMany: async () => [meal] } };
  const result = await buildSaleRowsAndDeductions(tx, [{ menuItemId: meal.id, quantity: 2, unitPrice: 1 }, { menuItemId: meal.id, quantity: 1, variationName: 'Large' }]);
  assert.equal(result.itemRows.reduce((sum, row) => sum + row.total, 0), 5000);
  await assert.rejects(buildSaleRowsAndDeductions(tx, [{ menuItemId: meal.id, quantity: 1, variationName: 'Missing' }]));
  await assert.rejects(buildSaleRowsAndDeductions({ menuItem: { findMany: async () => [] } }, body().items));
});

test('stock updates use an atomic lower-bound check and do not record failed deductions', async () => {
  let movement = false;
  const tx = { stockItem: { updateMany: async ({ where, data }) => { assert.equal(where.quantity.gte, 2); assert.equal(data.quantity.decrement, 2); return { count: 0 }; } }, stockMovement: { create: async () => { movement = true; } } };
  await assert.rejects(applyStockDeductions(tx, new Map([['stock', { stockItem: { id: 'stock', name: 'Rice' }, quantity: 2 }]]), 'Test'));
  assert.equal(movement, false);
});

test('WhatsApp uses confirmed prices, options, notes and encoded configured phone', () => {
  const order = { id: 'saved', orderNo: 'WEB-1', customerName: 'Test buyer', customerPhone: '600000000', deliveryAddress: 'Test & address', deliveryNote: 'Rice: no pepper', subtotal: 4000, deliveryFee: 500, total: 4500, items: [{ menuItem: meal, variationName: 'Large', quantity: 2, unitPrice: 2000, total: 4000 }] };
  const message = savedOrderMessage(order);
  assert.match(message, /Large/); assert.match(message, /4,500 FCFA/); assert.match(message, /Rice: no pepper/);
  const url = new URL(orderWhatsAppUrl(order, '+237 600 000 000'));
  assert.equal(url.pathname, '/237600000000'); assert.equal(url.searchParams.get('text'), message);
  assert.equal(orderWhatsAppUrl(order, ''), null);
  assert.equal(orderWhatsAppUrl({}, '+237600000000'), null);
});

test('customer sessions cannot access a different account or use forged tokens', () => {
  const token = signCustomerSession({ id: 'customer-1', phone: '+237600000000' });
  assert.equal(readCustomerSession(token).sub, 'customer-1');
  assert.throws(() => readCustomerSession(token + 'bad'));
  let error;
  customerSession({ headers: { 'x-customer-token': token }, params: { id: 'customer-2' }, path: '/public/customers/customer-2/orders' }, {}, result => { error = result; });
  assert.equal(error.statusCode, 403);
});

test('order handler commits before optional notifications; replay and admin reads reuse saved data', async () => {
  const { prisma } = await import('../src/config/prisma.js');
  const { createOnlineOrder, listOnlineOrders } = await import('../src/controllers/public.controller.js');
  const customer = { id: 'customer-1', name: 'Test buyer', phone: '+237600000000', points: 0 };
  const saved = new Map(); let committed = false; let creations = 0;
  const originals = { transaction: prisma.$transaction, find: prisma.onlineOrder.findUnique, list: prisma.onlineOrder.findMany, settings: prisma.appSettings.findUnique, notify: prisma.notification.create };
  const tx = {
    customer: { findUnique: async ({ where }) => where.referralCode ? null : customer, upsert: async () => customer, update: async () => customer },
    menuItem: { findMany: async () => [meal] },
    onlineOrder: { create: async ({ data }) => { creations++; const result = { ...data, id: 'order-1', status: 'PENDING', createdAt: new Date(), items: data.items.create.map(row => ({ ...row, id: 'row-1', menuItem: meal })), trackingEvents: [] }; saved.set(data.orderNo, result); return result; }, count: async () => 1 },
    deliveryTrackingEvent: { create: async ({ data }) => { [...saved.values()][0].trackingEvents.push(data); } }
  };
  prisma.$transaction = async fn => { const result = await fn(tx); committed = true; return result; };
  prisma.onlineOrder.findUnique = async ({ where }) => saved.get(where.orderNo) || null;
  prisma.onlineOrder.findMany = async () => [...saved.values()];
  prisma.appSettings.findUnique = async () => ({ deliveryFee: 500, publicOrdering: true });
  prisma.notification.create = async () => { assert.equal(committed, true); throw new Error('Notification unavailable'); };
  const invoke = (handler, request) => new Promise((resolve, reject) => handler(request, { status(code) { this.code = code; return this; }, json(data) { resolve({ data, status: this.code || 200 }); } }, reject));
  try {
    const req = { body: { ...body(), deliveryFee: 0 }, customerSession: { sub: customer.id, phone: customer.phone } };
    const first = await invoke(createOnlineOrder, req);
    assert.equal(first.status, 201); assert.equal(first.data.total, 3500);
    const retry = await invoke(createOnlineOrder, req);
    assert.equal(retry.data.id, first.data.id); assert.equal(creations, 1);
    await assert.rejects(invoke(createOnlineOrder, { ...req, body: { ...req.body, deliveryNote: 'Changed' } }), { statusCode: 409 });
    const admin = await invoke(listOnlineOrders, {});
    assert.equal(admin.data.items[0].id, first.data.id);
  } finally {
    prisma.$transaction = originals.transaction; prisma.onlineOrder.findUnique = originals.find; prisma.onlineOrder.findMany = originals.list; prisma.appSettings.findUnique = originals.settings; prisma.notification.create = originals.notify;
    await prisma.$disconnect();
  }
});
