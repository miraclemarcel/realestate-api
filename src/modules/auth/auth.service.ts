import bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import {
  generateRandomToken,
  hashToken,
  JwtPayload,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/jwt';
import { emailService } from '../email';
import {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UpdateProfileInput,
} from './auth.validation';

const SALT_ROUNDS = 12;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Strips sensitive fields before a user is returned to the client. */
export const toPublicUser = (user: User) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

/** Issues a new access/refresh token pair and stores the refresh token hash (rotation). */
const issueTokens = async (user: User) => {
  const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: hashToken(refreshToken) },
  });

  return { accessToken, refreshToken };
};

const findUserOrThrow = async (id: string) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw ApiError.notFound('User not found');
  return user;
};

export const authService = {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw ApiError.conflict('An account with this email already exists');

    const verificationToken = generateRandomToken();
    const user = await prisma.user.create({
      data: {
        ...input,
        password: await bcrypt.hash(input.password, SALT_ROUNDS),
        emailVerificationToken: hashToken(verificationToken),
        emailVerificationExpiry: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
      },
    });

    void emailService.sendWelcomeEmail(user, verificationToken);

    const tokens = await issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  },

  async login({ email, password }: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email } });
    // Same message for unknown email and wrong password, to avoid leaking which emails exist.
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const tokens = await issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  },

  async refreshToken(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.refreshToken !== hashToken(refreshToken)) {
      throw ApiError.unauthorized('Refresh token has been revoked');
    }

    return issueTokens(user);
  },

  async logout(userId: string) {
    await prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
  },

  async getProfile(userId: string) {
    const user = await findUserOrThrow(userId);
    return toPublicUser(user);
  },

  async updateProfile(userId: string, input: UpdateProfileInput) {
    await findUserOrThrow(userId);
    const user = await prisma.user.update({ where: { id: userId }, data: input });
    return toPublicUser(user);
  },

  async verifyEmail(token: string) {
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: hashToken(token),
        emailVerificationExpiry: { gt: new Date() },
      },
    });
    if (!user) throw ApiError.badRequest('Invalid or expired verification token');

    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerificationToken: null, emailVerificationExpiry: null },
    });
  },

  async resendVerification(userId: string) {
    const user = await findUserOrThrow(userId);
    if (user.isEmailVerified) throw ApiError.badRequest('Email is already verified');

    const verificationToken = generateRandomToken();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: hashToken(verificationToken),
        emailVerificationExpiry: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
      },
    });

    void emailService.sendVerificationEmail(user, verificationToken);
  },

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    // Respond the same way whether or not the account exists.
    if (!user) return;

    const resetToken = generateRandomToken();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashToken(resetToken),
        passwordResetExpiry: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });

    void emailService.sendPasswordResetEmail(user, resetToken);
  },

  async resetPassword({ token, password }: ResetPasswordInput) {
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashToken(token),
        passwordResetExpiry: { gt: new Date() },
      },
    });
    if (!user) throw ApiError.badRequest('Invalid or expired password reset token');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(password, SALT_ROUNDS),
        passwordResetToken: null,
        passwordResetExpiry: null,
        refreshToken: null, // sign out of all sessions
      },
    });

    void emailService.sendPasswordChangedEmail(user);
  },

  async changePassword(userId: string, { currentPassword, newPassword }: ChangePasswordInput) {
    const user = await findUserOrThrow(userId);
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw ApiError.badRequest('Current password is incorrect');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(newPassword, SALT_ROUNDS) },
    });

    void emailService.sendPasswordChangedEmail(user);
  },
};
