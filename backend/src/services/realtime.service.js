import { readCustomerSession } from '../middleware/customerSession.js';
import { prisma } from '../config/prisma.js';
let io;

export const initRealtime = (server, options = {}) => {
  io = options.io;
  io.on('connection', (socket) => {
    socket.on('order:join', async (request) => {
      try {
        const session = readCustomerSession(request?.token);
        const order = await prisma.onlineOrder.findUnique({ where: { id: request.id }, select: { customerId: true } });
        if (order?.customerId === session.sub) socket.join(`order:${request.id}`);
      } catch { /* Reject unauthorized subscriptions without exposing order data. */ }
    });
    socket.on('order:leave', (orderId) => {
      if (orderId) socket.leave(`order:${orderId}`);
    });
  });
  return io;
};

export const emitOrderUpdate = (order) => {
  if (!io || !order?.id) return;
  io.to(`order:${order.id}`).emit('order:updated', order);
  io.emit('dispatch:order-updated', {
    id: order.id,
    orderNo: order.orderNo,
    status: order.status,
    etaMinutes: order.etaMinutes,
    distanceKm: order.distanceKm,
    trackingUpdatedAt: order.trackingUpdatedAt
  });
};
