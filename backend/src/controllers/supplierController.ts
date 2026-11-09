import { Request, Response, NextFunction } from 'express';
import { SupplierRepository } from '../repositories/supplierRepository';
import { PurchaseRepository } from '../repositories/purchaseRepository';
import { sendSuccess, sendError } from '../utils/response';
import { supplierSchema, supplierPaymentSchema } from '../validators/schemas';

export class SupplierController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, includeArchived, limit, offset } = req.query;
      const result = await SupplierRepository.list({
        businessId: req.user!.businessId,
        search: search as string,
        includeArchived: includeArchived === 'true',
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
      const supplier = await SupplierRepository.findById(req.user!.businessId, req.params.id);
      if (!supplier) return sendError(res, 'Supplier not found', 404);
      return sendSuccess(res, supplier);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = supplierSchema.parse(req.body);
      const supplier = await SupplierRepository.create(req.user!.businessId, parsed);
      return sendSuccess(res, supplier, 'Supplier added successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = supplierSchema.partial().parse(req.body);
      const supplier = await SupplierRepository.update(
        req.user!.businessId,
        req.params.id,
        parsed
      );
      if (!supplier) return sendError(res, 'Supplier not found', 404);
      return sendSuccess(res, supplier, 'Supplier updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async archive(req: Request, res: Response, next: NextFunction) {
    try {
      const success = await SupplierRepository.archive(req.user!.businessId, req.params.id);
      if (!success) return sendError(res, 'Supplier not found', 404);
      return sendSuccess(res, null, 'Supplier archived successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const payments = await SupplierRepository.getPayments(
        req.user!.businessId,
        req.params.id
      );
      return sendSuccess(res, payments);
    } catch (error) {
      next(error);
    }
  }

  static async recordPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = supplierPaymentSchema.parse({
        ...req.body,
        supplierId: req.params.id,
      });
      const payment = await PurchaseRepository.recordPayment(
        req.user!.businessId,
        parsed,
        req.user!.userId
      );
      return sendSuccess(res, payment, 'Supplier payment recorded successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}
