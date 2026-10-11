import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { authController } from './auth.controller';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
} from './auth.validation';

// Stricter limit on endpoints that are targets for brute force / email spam.
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});

const router = Router();

// Public
router.post('/register', sensitiveLimiter, validate(registerSchema), authController.register);
router.post('/login', sensitiveLimiter, validate(loginSchema), authController.login);
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken);
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post('/forgot-password', sensitiveLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', sensitiveLimiter, validate(resetPasswordSchema), authController.resetPassword);

// Authenticated
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.patch('/me', authenticate, validate(updateProfileSchema), authController.updateProfile);
router.post('/resend-verification', authenticate, sensitiveLimiter, authController.resendVerification);
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

export default router;
