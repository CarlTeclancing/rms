let io;

export const initRealtime = (server, options = {}) => {
  io = options.io;
  io.on('connection', (socket) => {
    socket.on('order:join', (orderId) => {
      if (orderId) socket.join(`order:${orderId}`);
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
    driverLatitude: order.driverLatitude,
    driverLongitude: order.driverLongitude,
    trackingUpdatedAt: order.trackingUpdatedAt
  });
};
