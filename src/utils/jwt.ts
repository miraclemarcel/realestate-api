import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export const signAccessToken = (payload: JwtPayload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
  });

// A unique jwtid makes every refresh token distinct, even when two are issued in the
// same second, so rotation can always tell the current token apart from older ones.
export const signRefreshToken = (payload: JwtPayload) =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
    jwtid: crypto.randomUUID(),
  });

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;

/** Random token sent to the user (e.g. in an email link). */
export const generateRandomToken = () => crypto.randomBytes(32).toString('hex');

/** Only hashes of tokens are stored in the database. */
export const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');
