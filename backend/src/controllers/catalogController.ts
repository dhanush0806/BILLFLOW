import { Request, Response, NextFunction } from 'express';
import { CatalogRepository } from '../repositories/catalogRepository';
import { sendSuccess, sendError } from '../utils/response';

export class CatalogController {
  // PRODUCTS
  static async listProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const { search, category, includeArchived } = req.query;

      const products = await CatalogRepository.listProducts({
        businessId,
        search: search as string,
        category: category as string,
        includeArchived: includeArchived === 'true',
      });
      return sendSuccess(res, products);
    } catch (err) {
      next(err);
    }
  }

  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const product = await CatalogRepository.createProduct({
        businessId,
        name: req.body.name,
        code: req.body.code,
        description: req.body.description,
        category: req.body.category,
        price: req.body.price,
        unit: req.body.unit,
        stockQuantity: req.body.stockQuantity,
        isActive: req.body.isActive,
      });
      return sendSuccess(res, product, 'Product created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const updated = await CatalogRepository.updateProduct(businessId, req.params.id, req.body);
      if (!updated) return sendError(res, 'Product not found', 404);

      return sendSuccess(res, updated, 'Product updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async archiveProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const archived = await CatalogRepository.archiveProduct(businessId, req.params.id);
      if (!archived) return sendError(res, 'Product not found', 404);

      return sendSuccess(res, { archived: true }, 'Product archived successfully');
    } catch (err) {
      next(err);
    }
  }

  // SERVICES
  static async listServices(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const { search, category, includeArchived } = req.query;

      const services = await CatalogRepository.listServices({
        businessId,
        search: search as string,
        category: category as string,
        includeArchived: includeArchived === 'true',
      });
      return sendSuccess(res, services);
    } catch (err) {
      next(err);
    }
  }

  static async createService(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const service = await CatalogRepository.createService({
        businessId,
        name: req.body.name,
        description: req.body.description,
        category: req.body.category,
        defaultPrice: req.body.defaultPrice,
        unit: req.body.unit,
        isActive: req.body.isActive,
      });
      return sendSuccess(res, service, 'Service created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async updateService(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const updated = await CatalogRepository.updateService(businessId, req.params.id, req.body);
      if (!updated) return sendError(res, 'Service not found', 404);

      return sendSuccess(res, updated, 'Service updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async archiveService(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const archived = await CatalogRepository.archiveService(businessId, req.params.id);
      if (!archived) return sendError(res, 'Service not found', 404);

      return sendSuccess(res, { archived: true }, 'Service archived successfully');
    } catch (err) {
      next(err);
    }
  }
}
