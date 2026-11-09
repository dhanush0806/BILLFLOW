import { Router } from 'express';
import { ReportController } from '../controllers/reportController';
import { authenticateJwt, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateJwt);
router.use(requireRole('admin'));

router.get('/dashboard', ReportController.getDashboard);
router.get('/daily-sales', ReportController.getDailySales);
router.get('/product-sales', ReportController.getProductSales);
router.get('/category-sales', ReportController.getCategorySales);
router.get('/top-selling', ReportController.getTopSelling);
router.get('/gross-profit', ReportController.getGrossProfit);
router.get('/customer-balances', ReportController.getCustomerBalances);
router.get('/supplier-balances', ReportController.getSupplierBalances);
router.get('/purchases', ReportController.getPurchaseReport);
router.get('/returns', ReportController.getReturnReport);

export default router;
