import { Request, Response, NextFunction } from 'express';
import { PurchaseRepository } from '../repositories/purchaseRepository';
import { sendSuccess, sendError } from '../utils/response';
import { purchaseSchema } from '../validators/schemas';

export class PurchaseController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { supplierId, paymentStatus, status, startDate, endDate, search, limit, offset } = req.query;
      const result = await PurchaseRepository.list({
        businessId: req.user!.businessId,
        supplierId: supplierId as string,
        paymentStatus: paymentStatus as string,
        status: status as string,
        startDate: startDate as string,
        endDate: endDate as string,
        search: search as string,
        limit: limit ? parseInt(limit as string, 10) : 50,
        offset: offset ? parseInt(offset as string, 10) : 0,
      });
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const purchase = await PurchaseRepository.findById(req.user!.businessId, req.params.id);
      if (!purchase) return sendError(res, 'Purchase order not found', 404);
      return sendSuccess(res, purchase);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = purchaseSchema.parse(req.body);
      const purchase = await PurchaseRepository.create(
        req.user!.businessId,
        parsed as any,
        req.user!.userId
      );
      const msg = parsed.status === 'received'
        ? 'Purchase record created and inventory stock updated'
        : 'Purchase order created successfully (Pending goods receipt)';
      return sendSuccess(res, purchase, msg, 201);
    } catch (error: any) {
      if (error.message === 'Supplier not found') {
        return sendError(res, error.message, 404);
      }
      next(error);
    }
  }

  static async receiveGoods(req: Request, res: Response, next: NextFunction) {
    try {
      const purchase = await PurchaseRepository.receiveGoods(
        req.user!.businessId,
        req.params.id,
        req.user!.userId
      );
      return sendSuccess(res, purchase, 'Purchased goods marked as received and stock successfully updated.');
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return sendError(res, error.message, 404);
      }
      if (error.message.includes('already been received')) {
        return sendError(res, error.message, 400);
      }
      next(error);
    }
  }
}
