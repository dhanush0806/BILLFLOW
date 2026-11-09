import { Request, Response, NextFunction } from 'express';
import { ExpenseRepository } from '../repositories/expenseRepository';
import { sendSuccess, sendError } from '../utils/response';

export class ExpenseController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const { category, startDate, endDate, search, limit, offset } = req.query;

      const result = await ExpenseRepository.list({
        businessId,
        category: category as string,
        startDate: startDate as string,
        endDate: endDate as string,
        search: search as string,
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
      const expense = await ExpenseRepository.findById(businessId, req.params.id);
      if (!expense) return sendError(res, 'Expense not found', 404);

      return sendSuccess(res, expense);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const expense = await ExpenseRepository.create({
        businessId,
        title: req.body.title,
        category: req.body.category,
        amount: req.body.amount,
        expenseDate: req.body.expenseDate,
        paymentMethod: req.body.paymentMethod,
        description: req.body.description,
      });

      return sendSuccess(res, expense, 'Expense recorded successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const updated = await ExpenseRepository.update(businessId, req.params.id, req.body);
      if (!updated) return sendError(res, 'Expense not found', 404);

      return sendSuccess(res, updated, 'Expense updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.user!.businessId;
      const deleted = await ExpenseRepository.delete(businessId, req.params.id);
      if (!deleted) return sendError(res, 'Expense not found', 404);

      return sendSuccess(res, { deleted: true }, 'Expense deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}
