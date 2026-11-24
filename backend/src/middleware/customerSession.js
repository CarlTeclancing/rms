import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

export const signCustomerSession = customer => jwt.sign({ sub: customer.id, phone: customer.phone, scope: 'customer' }, env.jwtSecret, { expiresIn: '30d' });
export const readCustomerSession = token => {
  const payload = jwt.verify(token, env.jwtSecret);
  if (payload.scope !== 'customer') throw new ApiError(401, 'Customer session required');
  return payload;
};
export function customerSession(req, _res, next) {
  try {
    req.customerSession = readCustomerSession(req.headers['x-customer-token']);
    if (req.params.id && req.path.includes('/customers/') && req.params.id !== req.customerSession.sub) throw new ApiError(403, 'This account belongs to another customer');
    next();
  } catch (error) { next(error.statusCode ? error : new ApiError(401, 'Please sign in again')); }
}
