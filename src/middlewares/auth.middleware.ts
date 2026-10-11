import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { ApiError } from '../utils/ApiError';
import { verifyAccessToken } from '../utils/jwt';

/** Requires a valid `Authorization: Bearer <accessToken>` header. */
export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Authentication token is missing'));
  }

  try {
    req.user = verifyAccessToken(header.slice(7));
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired authentication token'));
  }
};

/** Restricts a route to the given roles. Must be used after `authenticate`. */
export const authorize =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
