import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      message = 'A record with this value already exists';
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Resource not found';
    } else if (err.code === 'P2023') {
      statusCode = 400;
      message = 'Malformed ID';
    }
  } else if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON payload';
  }

  if (statusCode === 500) console.error(err);

  res.status(statusCode).json({
    success: false,
    message,
    ...(details !== undefined && { errors: details }),
    ...(env.NODE_ENV === 'development' && statusCode === 500 && err instanceof Error && { stack: err.stack }),
  });
};
