export const orderStatusLabels = {
  PENDING: 'Pending confirmation', ACCEPTED: 'Confirmed', PREPARING: 'Preparing', READY: 'Ready for pickup',
  DRIVER_ASSIGNED: 'Driver assigned', DRIVER_TO_RESTAURANT: 'Driver heading to restaurant', DRIVER_ARRIVED: 'Driver at restaurant',
  PICKED_UP: 'Picked up', OUT_FOR_DELIVERY: 'Out for delivery', DRIVER_NEARBY: 'Driver nearby', DELIVERED: 'Delivered', CANCELLED: 'Cancelled'
};
export const fcfa = value => `${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} FCFA`;
export const newOrderRequestId = () => globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

export function savedOrderMessage(order) {
  if (!order?.id || !order.orderNo || !order.items?.length) throw new Error('A confirmed order is required');
  return [
    'Hello ChopASAP,', '', 'I would like to confirm my order.', '', 'ORDER DETAILS',
    `Order Reference: ${order.orderNo}`, `Customer: ${order.customerName}`, `Phone: ${order.customerPhone}`, '', 'ITEMS',
    ...order.items.map((item, index) => `${index + 1}. ${item.menuItem?.name || item.name}${item.variationName ? ` (${item.variationName})` : ''}\nQuantity: ${item.quantity}\nUnit Price: ${fcfa(item.unitPrice)}\nTotal: ${fcfa(item.total)}`),
    '', 'ORDER SUMMARY', `Subtotal: ${fcfa(order.subtotal)}`, `Delivery Fee: ${fcfa(order.deliveryFee)}`, `Total: ${fcfa(order.total)}`,
    '', 'DELIVERY INFORMATION', `Location: ${order.deliveryAddress}`,
    order.isGift ? `Recipient: ${order.recipientName} (${order.recipientPhone})\nRecipient address: ${order.recipientAddress || order.deliveryAddress}` : '',
    order.deliveryNote ? `Special instructions: ${order.deliveryNote}` : '', '', 'Kindly confirm my order and delivery arrangements.', 'Thank you.'
  ].join('\n');
}

export function orderWhatsAppUrl(order, businessPhone) {
  if (!order?.id || !order.orderNo || !order.items?.length) return null;
  const phone = String(businessPhone || '').replace(/\D/g, '');
  if (!/^\d{8,15}$/.test(phone)) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(savedOrderMessage(order))}`;
}
