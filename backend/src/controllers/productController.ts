import { Request, Response, NextFunction } from 'express';
import { ProductRepository } from '../repositories/productRepository';
import { sendSuccess, sendError } from '../utils/response';
import { productSchema } from '../validators/schemas';

export class ProductController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, categoryId, stockStatus, includeArchived, limit, offset } = req.query;
      const result = await ProductRepository.list({
        businessId: req.user!.businessId,
        search: search as string,
        categoryId: categoryId as string,
        stockStatus: stockStatus as any,
        includeArchived: includeArchived === 'true',
        limit: limit ? parseInt(limit as string, 10) : 100,
        offset: offset ? parseInt(offset as string, 10) : 0,
      });
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductRepository.findById(req.user!.businessId, req.params.id);
      if (!product) return sendError(res, 'Product not found', 404);
      return sendSuccess(res, product);
    } catch (error) {
      next(error);
    }
  }

  static async lookupBarcode(req: Request, res: Response, next: NextFunction) {
    try {
      const code = req.params.code || (req.query.code as string);
      if (!code) return sendError(res, 'Barcode or SKU required', 400);

      const product = await ProductRepository.findByBarcodeOrSku(req.user!.businessId, code);
      if (!product) return sendError(res, 'Product not found for this barcode/SKU', 404);
      return sendSuccess(res, product);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = productSchema.parse(req.body);
      const product = await ProductRepository.create(
        req.user!.businessId,
        parsed,
        req.user!.userId
      );
      return sendSuccess(res, product, 'Product added successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = productSchema.partial().parse(req.body);
      const product = await ProductRepository.update(
        req.user!.businessId,
        req.params.id,
        parsed
      );
      if (!product) return sendError(res, 'Product not found', 404);
      return sendSuccess(res, product, 'Product updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async archive(req: Request, res: Response, next: NextFunction) {
    try {
      const success = await ProductRepository.archive(req.user!.businessId, req.params.id);
      if (!success) return sendError(res, 'Product not found', 404);
      return sendSuccess(res, null, 'Product archived successfully');
    } catch (error) {
      next(error);
    }
  }

  static async importCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const items = req.body.items;
      if (!Array.isArray(items) || items.length === 0) {
        return sendError(res, 'Invalid CSV data: array of product rows expected', 400);
      }

      const result = await ProductRepository.batchImport(
        req.user!.businessId,
        items,
        req.user!.userId
      );
      return sendSuccess(res, result, `Imported ${result.inserted} products`);
    } catch (error) {
      next(error);
    }
  }
}
