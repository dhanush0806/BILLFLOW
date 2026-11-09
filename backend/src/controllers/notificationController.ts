import { Request, Response, NextFunction } from 'express';
import { NotificationRepository } from '../repositories/notificationRepository';
import { sendSuccess } from '../utils/response';

export class NotificationController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const userId = req.user!.userId;
      const { limit } = req.query;

      const result = await NotificationRepository.list({
        businessId,
        userId,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      await NotificationRepository.markAsRead(businessId, req.params.id);
      return sendSuccess(res, null, 'Notification marked as read');
    } catch (err) {
      next(err);
    }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const userId = req.user!.userId;
      await NotificationRepository.markAllAsRead(businessId, userId);
      return sendSuccess(res, null, 'All notifications marked as read');
    } catch (err) {
      next(err);
    }
  }
}
