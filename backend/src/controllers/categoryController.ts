import { Request, Response, NextFunction } from 'express';
import { CategoryRepository } from '../repositories/categoryRepository';
import { sendSuccess, sendError } from '../utils/response';
import { categorySchema } from '../validators/schemas';

export class CategoryController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await CategoryRepository.list(req.user!.businessId);
      return sendSuccess(res, categories);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = categorySchema.parse(req.body);
      const category = await CategoryRepository.create(
        req.user!.businessId,
        parsed.name,
        parsed.description
      );
      return sendSuccess(res, category, 'Category created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = categorySchema.parse(req.body);
      const category = await CategoryRepository.update(
        req.user!.businessId,
        req.params.id,
        parsed.name,
        parsed.description
      );
      if (!category) return sendError(res, 'Category not found', 404);
      return sendSuccess(res, category, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const success = await CategoryRepository.delete(req.user!.businessId, req.params.id);
      if (!success) return sendError(res, 'Category not found', 404);
      return sendSuccess(res, null, 'Category deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
