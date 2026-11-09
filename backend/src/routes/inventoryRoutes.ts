import { Router } from 'express';
import { InventoryController } from '../controllers/inventoryController';
import { authenticateJwt, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateJwt);

router.get('/overview', requireRole('admin', 'cashier'), InventoryController.getOverview);
router.get('/low-stock', requireRole('admin', 'cashier'), InventoryController.getLowStock);
router.get('/out-of-stock', requireRole('admin', 'cashier'), InventoryController.getOutOfStock);
router.get('/movements', requireRole('admin', 'cashier'), InventoryController.getMovements);
router.get('/valuation', requireRole('admin'), InventoryController.getValuation);
router.post('/adjust', requireRole('admin'), InventoryController.adjustStock);

export default router;
