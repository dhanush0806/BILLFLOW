import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { UserRepository } from '../repositories/userRepository';
import { sendSuccess, sendError } from '../utils/response';
import bcrypt from 'bcrypt';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.registerBusiness(req.body);
      return sendSuccess(res, result, 'Business registered successfully', 201);
    } catch (err: any) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      return sendSuccess(res, result, 'Login successful');
    } catch (err: any) {
      return sendError(res, err.message, 401);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const result = await AuthService.initiateForgotPassword(email);
      return sendSuccess(res, result, result.message);
    } catch (err: any) {
      next(err);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, newPassword, recoveryPin } = req.body;
      const result = await AuthService.resetPassword(email, newPassword, recoveryPin);
      return sendSuccess(res, result, result.message);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Unauthorized', 401);
      const user = await UserRepository.findById(req.user.userId);
      if (!user) return sendError(res, 'User not found', 404);

      return sendSuccess(res, {
        id: user.id,
        businessId: user.business_id,
        role: user.role,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
      });
    } catch (err: any) {
      next(err);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendError(res, 'Unauthorized', 401);
      const { currentPassword, newPassword } = req.body;

      const user = await UserRepository.findById(req.user.userId);
      if (!user) return sendError(res, 'User not found', 404);

      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return sendError(res, 'Current password does not match', 400);
      }

      const hash = await bcrypt.hash(newPassword, 10);
      await UserRepository.updatePassword(user.id, hash);

      return sendSuccess(res, null, 'Password updated successfully');
    } catch (err: any) {
      next(err);
    }
  }
}
