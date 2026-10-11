import { NextFunction, Request, Response } from 'express';
import { ZodType } from 'zod';
import { ApiError } from '../utils/ApiError';

type Source = 'body' | 'query' | 'params';

/**
 * Validates and parses part of the request with a Zod schema.
 * Parsed values (with coercions/defaults applied) are stored in `res.locals[source]`
 * for query/params, and replace `req.body` for body.
 */
export const validate =
  (schema: ZodType, source: Source = 'body') =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return next(ApiError.badRequest('Validation failed', details));
    }

    if (source === 'body') req.body = result.data;
    res.locals[source] = result.data;
    next();
  };
