import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/paymentService';
import { sendSuccess, sendError } from '../utils/response';

export class PaymentController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const { invoiceId, customerId, paymentMethod, startDate, endDate, limit, offset } = req.query;

      const result = await PaymentService.listPayments({
        businessId,
        invoiceId: invoiceId as string,
        customerId: customerId as string,
        paymentMethod: paymentMethod as string,
        startDate: startDate as string,
        endDate: endDate as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });

      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const payment = await PaymentService.getPayment(businessId, req.params.id);
      return sendSuccess(res, payment);
    } catch (err: any) {
      return sendError(res, err.message, 404);
    }
  }

  static async record(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const userId = req.user!.userId;

      const payment = await PaymentService.recordPayment(businessId, userId, req.body);
      return sendSuccess(res, payment, 'Payment recorded successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async reverse(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const userId = req.user!.userId;

      const reversed = await PaymentService.reversePayment(businessId, userId, req.params.id);
      return sendSuccess(res, reversed, 'Payment reversed successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async downloadReceiptPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const paymentId = req.params.id;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="receipt_${paymentId.substring(0, 8)}.pdf"`
      );

      await PaymentService.streamPaymentReceiptPDF(businessId, paymentId, res);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to generate receipt PDF', 500);
    }
  }
}
