import { Request, Response, NextFunction } from 'express';
import { PosRepository } from '../repositories/posRepository';
import { sendSuccess, sendError } from '../utils/response';
import { posCheckoutSchema } from '../validators/schemas';
import { logAudit } from '../utils/auditLogger';

export class PosController {
  static async checkout(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = posCheckoutSchema.parse(req.body);
      const result = await PosRepository.checkout(
        req.user!.businessId,
        parsed as any,
        req.user!.userId
      );

      await logAudit({
        businessId: req.user!.businessId,
        userId: req.user!.userId,
        action: 'POS_SALE_COMPLETED',
        entityType: 'invoice',
        entityId: result.invoice.id,
        details: {
          billNumber: result.invoice.invoice_number,
          grandTotal: result.invoice.grand_total,
          paymentMethod: result.invoice.payment_method,
        },
      });

      return sendSuccess(res, result, 'Sale completed successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}
