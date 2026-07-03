import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const signAccessToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role.name }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn
  });
