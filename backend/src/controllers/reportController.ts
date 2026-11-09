import { Request, Response, NextFunction } from 'express';
import { ReportRepository } from '../repositories/reportRepository';
import { sendSuccess } from '../utils/response';

export class ReportController {
  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const range = (req.query.range as string) || '30d';
      const data = await ReportRepository.getDashboardMetrics(req.user!.businessId, range);
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  static async getDailySales(req: Request, res: Response, next: NextFunction) {
    try {
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
      const data = await ReportRepository.getDailySalesReport(req.user!.businessId, days);
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  static async getProductSales(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      const data = await ReportRepository.getProductSalesReport(
        req.user!.businessId,
        startDate as string,
        endDate as string
      );
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  static async getCategorySales(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ReportRepository.getCategorySalesReport(req.user!.businessId);
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  static async getTopSelling(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const data = await ReportRepository.getTopSellingProducts(req.user!.businessId, limit);
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  static async getGrossProfit(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ReportRepository.getGrossProfitOverview(req.user!.businessId);
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  static async getCustomerBalances(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ReportRepository.getCustomerBalances(req.user!.businessId);
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  static async getSupplierBalances(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ReportRepository.getSupplierBalances(req.user!.businessId);
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  static async getPurchaseReport(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ReportRepository.getPurchaseReport(req.user!.businessId);
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  static async getReturnReport(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ReportRepository.getReturnReport(req.user!.businessId);
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }
}
