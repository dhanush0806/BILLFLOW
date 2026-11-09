import { Request, Response, NextFunction } from 'express';
import { InvoiceService } from '../services/invoiceService';
import { calculateInvoiceFinancials } from '../utils/calculator';
import { sendSuccess, sendError } from '../utils/response';

export class InvoiceController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const { customerId, status, search, startDate, endDate, limit, offset } = req.query;

      const result = await InvoiceService.listInvoices({
        businessId,
        customerId: customerId as string,
        status: status as string,
        search: search as string,
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
      const invoice = await InvoiceService.getInvoice(businessId, req.params.id);
      return sendSuccess(res, invoice);
    } catch (err: any) {
      return sendError(res, err.message, 404);
    }
  }

  static async previewCalculation(req: Request, res: Response, next: NextFunction) {
    try {
      const calculation = calculateInvoiceFinancials({
        items: req.body.items || [],
        discount_type: req.body.discountType || 'fixed',
        discount_value: req.body.discountValue || 0,
        tax_rate: req.body.taxRate || 0,
        other_charges: req.body.otherCharges || 0,
      });
      return sendSuccess(res, calculation);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const userId = req.user!.userId;

      const invoice = await InvoiceService.createInvoice(businessId, userId, req.body);
      return sendSuccess(res, invoice, 'Invoice created successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async issue(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const userId = req.user!.userId;

      const issued = await InvoiceService.issueInvoice(businessId, userId, req.params.id);
      return sendSuccess(res, issued, 'Invoice issued successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const userId = req.user!.userId;

      const cancelled = await InvoiceService.cancelInvoice(businessId, userId, req.params.id);
      return sendSuccess(res, cancelled, 'Invoice cancelled successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async downloadPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const invoiceId = req.params.id;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="invoice_${invoiceId.substring(0, 8)}.pdf"`
      );

      await InvoiceService.streamInvoicePDF(businessId, invoiceId, res);
    } catch (err: any) {
      return sendError(res, err.message || 'Failed to generate PDF', 500);
    }
  }
}
