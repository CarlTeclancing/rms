import { createHash, randomUUID } from 'node:crypto';
import { ApiError } from '../utils/apiError.js';

export function validateOrderInput(body) {
  for (const key of ['customerName', 'customerPhone', 'deliveryAddress']) {
    if (typeof body[key] !== 'string' || !body[key].trim() || body[key].length > 500) throw new ApiError(422, `Invalid ${key}`);
  }
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 100) throw new ApiError(422, 'Choose between 1 and 100 meals');
  for (const item of body.items) {
    if (!item || typeof item.menuItemId !== 'string' || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) throw new ApiError(422, 'Meal quantities must be whole numbers between 1 and 99');
    if (item.variationName != null && (typeof item.variationName !== 'string' || item.variationName.length > 200)) throw new ApiError(422, 'Invalid meal option');
  }
  if (body.deliveryNote && (typeof body.deliveryNote !== 'string' || body.deliveryNote.length > 4000)) throw new ApiError(422, 'Instructions must be at most 4000 characters');
  if (body.fulfillment && !['delivery', 'pickup', 'onsite'].includes(body.fulfillment)) throw new ApiError(422, 'Invalid fulfillment option');
  if (body.isGift) {
    for (const key of ['recipientName', 'recipientPhone']) {
      if (typeof body[key] !== 'string' || !body[key].trim() || body[key].length > 500) throw new ApiError(422, 'Recipient name and phone are required');
    }
    if (body.recipientAddress != null && (typeof body.recipientAddress !== 'string' || body.recipientAddress.length > 500)) throw new ApiError(422, 'Invalid recipient address');
  }
  for (const [key, limit] of [['latitude', 90], ['longitude', 180]]) {
    if (body[key] != null && body[key] !== '' && (!Number.isFinite(Number(body[key])) || Math.abs(Number(body[key])) > limit)) throw new ApiError(422, `Invalid ${key}`);
  }
}

export function orderIdentity(body) {
  const key = body.requestId;
  if (key != null && (typeof key !== 'string' || !/^[a-zA-Z0-9-]{16,100}$/.test(key))) throw new ApiError(422, 'Invalid order request identifier');
  const phone = body.customerPhone.replace(/\s+/g, '').trim();
  const fingerprint = createHash('sha256').update(JSON.stringify({
    phone, name: body.customerName.trim(), address: body.deliveryAddress.trim(),
    note: body.deliveryNote || '', fulfillment: body.fulfillment || '',
    isGift: Boolean(body.isGift), recipientName: body.recipientName || '', recipientPhone: body.recipientPhone || '', recipientAddress: body.recipientAddress || '',
    items: body.items.map(({ menuItemId, quantity, variationName }) => ({ menuItemId, quantity, variationName: variationName || '' }))
  })).digest('hex');
  return { orderNo: key ? `WEB-${createHash('sha256').update(`${phone}:${key}`).digest('hex').slice(0, 24).toUpperCase()}` : `WEB-${randomUUID().toUpperCase()}`, fingerprint };
}

export function configuredDeliveryFee(body, settings) {
  // Retain the existing onsite marker for older installed clients.
  const onsite = ['pickup', 'onsite'].includes(body.fulfillment) || (!body.fulfillment && body.deliveryAddress === 'Reserve onsite');
  const fee = onsite ? 0 : Number(settings?.deliveryFee ?? 1000);
  if (!Number.isFinite(fee) || fee < 0) throw new ApiError(503, 'Delivery pricing is unavailable');
  return fee;
}
