import { Request, Response, NextFunction } from 'express';
import { InventoryRepository } from '../repositories/inventoryRepository';
import { sendSuccess, sendError } from '../utils/response';
import { stockAdjustmentSchema } from '../validators/schemas';

export class InventoryController {
  static async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const overview = await InventoryRepository.getOverview(req.user!.businessId);
      return sendSuccess(res, overview);
    } catch (error) {
      next(error);
    }
  }

  static async getLowStock(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await InventoryRepository.getLowStockProducts(req.user!.businessId);
      return sendSuccess(res, items);
    } catch (error) {
      next(error);
    }
  }

  static async getOutOfStock(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await InventoryRepository.getOutOfStockProducts(req.user!.businessId);
      return sendSuccess(res, items);
    } catch (error) {
      next(error);
    }
  }

  static async adjustStock(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = stockAdjustmentSchema.parse(req.body);
      const result = await InventoryRepository.adjustStock(
        req.user!.businessId,
        parsed,
        req.user!.userId
      );
      return sendSuccess(res, result, 'Stock adjusted successfully');
    } catch (error: any) {
      if (error.message === 'Product not found') {
        return sendError(res, error.message, 404);
      }
      next(error);
    }
  }

  static async getMovements(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId, movementType, startDate, endDate, limit, offset } = req.query;
      const result = await InventoryRepository.getMovements({
        businessId: req.user!.businessId,
        productId: productId as string,
        movementType: movementType as string,
        startDate: startDate as string,
        endDate: endDate as string,
        limit: limit ? parseInt(limit as string, 10) : 50,
        offset: offset ? parseInt(offset as string, 10) : 0,
      });
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async getValuation(req: Request, res: Response, next: NextFunction) {
    try {
      const report = await InventoryRepository.getValuationReport(req.user!.businessId);
      return sendSuccess(res, report);
    } catch (error) {
      next(error);
    }
  }
}
