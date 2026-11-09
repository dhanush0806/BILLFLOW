import { Request, Response, NextFunction } from 'express';
import { ReturnRepository } from '../repositories/returnRepository';
import { sendSuccess, sendError } from '../utils/response';
import { salesReturnSchema } from '../validators/schemas';
import { logAudit } from '../utils/auditLogger';

export class ReturnController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { invoiceId, startDate, endDate, search, limit, offset } = req.query;
      const result = await ReturnRepository.list({
        businessId: req.user!.businessId,
        invoiceId: invoiceId as string,
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
      const returnRecord = await ReturnRepository.findById(req.user!.businessId, req.params.id);
      if (!returnRecord) return sendError(res, 'Sales return record not found', 404);
      return sendSuccess(res, returnRecord);
    } catch (error) {
      next(error);
    }
  }

  static async getEligibility(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ReturnRepository.getBillReturnEligibility(
        req.user!.businessId,
        req.params.invoiceId
      );
      return sendSuccess(res, result);
    } catch (error: any) {
      if (error.message === 'Bill not found') {
        return sendError(res, error.message, 404);
      }
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = salesReturnSchema.parse(req.body);
      const salesReturn = await ReturnRepository.createReturn(
        req.user!.businessId,
        parsed,
        req.user!.userId
      );

      await logAudit({
        businessId: req.user!.businessId,
        userId: req.user!.userId,
        action: 'SALES_RETURN_RECORDED',
        entityType: 'sales_return',
        entityId: salesReturn.id,
        details: {
          returnNumber: salesReturn.return_number,
          totalRefund: salesReturn.total_refund_amount,
          refundMethod: salesReturn.refund_method,
        },
      });

      return sendSuccess(res, salesReturn, 'Sales return recorded and refunded', 201);
    } catch (error: any) {
      if (error.message.includes('Cannot return') || error.message.includes('not found')) {
        return sendError(res, error.message, 400);
      }
      next(error);
    }
  }
}
