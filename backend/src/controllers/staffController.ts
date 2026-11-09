import { Request, Response, NextFunction } from 'express';
import { StaffRepository } from '../repositories/staffRepository';
import { sendSuccess, sendError } from '../utils/response';
import { staffUserSchema } from '../validators/schemas';

export class StaffController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const staff = await StaffRepository.listStaff(req.user!.businessId);
      return sendSuccess(res, staff);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user!.role !== 'admin') {
        return sendError(res, 'Only administrators can create staff accounts', 403);
      }
      const parsed = staffUserSchema.parse(req.body);
      const user = await StaffRepository.createStaff(req.user!.businessId, parsed);
      return sendSuccess(res, user, 'Staff member added successfully', 201);
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        return sendError(res, error.message, 400);
      }
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user!.role !== 'admin') {
        return sendError(res, 'Only administrators can change staff status', 403);
      }
      const { isActive } = req.body;
      const success = await StaffRepository.updateStatus(
        req.user!.businessId,
        req.params.id,
        Boolean(isActive)
      );
      if (!success) return sendError(res, 'Staff member not found', 404);
      return sendSuccess(res, null, 'Staff status updated');
    } catch (error) {
      next(error);
    }
  }

  static async getActivityLogs(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user!.role !== 'admin') {
        return sendError(res, 'Only administrators can view staff activity logs', 403);
      }
      const logs = await StaffRepository.getActivityLogs(req.user!.businessId);
      return sendSuccess(res, logs);
    } catch (error) {
      next(error);
    }
  }
}
