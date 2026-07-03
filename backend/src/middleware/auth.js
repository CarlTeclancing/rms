import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

export const authenticate = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required');
    }

    const token = header.slice(7);
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true }
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new ApiError(401, 'Invalid or inactive user');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error.statusCode ? error : new ApiError(401, 'Invalid token'));
  }
};

export const authorize = (...permissions) => (req, _res, next) => {
  const userPermissions = Array.isArray(req.user?.role?.permissions) ? req.user.role.permissions : [];
  const hasAccess = permissions.length === 0 || permissions.some((permission) => userPermissions.includes(permission));

  if (!hasAccess) {
    return next(new ApiError(403, 'You do not have permission to perform this action'));
  }

  next();
};
