import { Router } from 'express';
import { PurchaseController } from '../controllers/purchaseController';
import { authenticateJwt, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateJwt);
router.use(requireRole('admin'));

router.get('/', PurchaseController.list);
router.get('/:id', PurchaseController.getById);
router.post('/', PurchaseController.create);
router.post('/:id/receive', PurchaseController.receiveGoods);

export default router;
