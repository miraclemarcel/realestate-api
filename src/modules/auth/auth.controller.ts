import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { authService } from './auth.service';

// Routes using these handlers are protected by `authenticate`, so req.user is always set.
const userId = (req: Request) => req.user!.sub;

export const authController = {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body);
    sendSuccess(res, result, 'Account created successfully. Please check your email to verify your account.', 201);
  },

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body);
    sendSuccess(res, result, 'Logged in successfully');
  },

  async refreshToken(req: Request, res: Response) {
    const tokens = await authService.refreshToken(req.body.refreshToken);
    sendSuccess(res, tokens, 'Token refreshed successfully');
  },

  async logout(req: Request, res: Response) {
    await authService.logout(userId(req));
    sendSuccess(res, null, 'Logged out successfully');
  },

  async me(req: Request, res: Response) {
    const user = await authService.getProfile(userId(req));
    sendSuccess(res, user, 'Profile retrieved successfully');
  },

  async updateProfile(req: Request, res: Response) {
    const user = await authService.updateProfile(userId(req), req.body);
    sendSuccess(res, user, 'Profile updated successfully');
  },

  async verifyEmail(req: Request, res: Response) {
    await authService.verifyEmail(req.body.token);
    sendSuccess(res, null, 'Email verified successfully');
  },

  async resendVerification(req: Request, res: Response) {
    await authService.resendVerification(userId(req));
    sendSuccess(res, null, 'Verification email sent');
  },

  async forgotPassword(req: Request, res: Response) {
    await authService.forgotPassword(req.body.email);
    sendSuccess(res, null, 'If an account with that email exists, a password reset link has been sent');
  },

  async resetPassword(req: Request, res: Response) {
    await authService.resetPassword(req.body);
    sendSuccess(res, null, 'Password reset successfully. Please log in with your new password.');
  },

  async changePassword(req: Request, res: Response) {
    await authService.changePassword(userId(req), req.body);
    sendSuccess(res, null, 'Password changed successfully');
  },
};
