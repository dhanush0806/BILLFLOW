import { Router } from 'express';
import { ReturnController } from '../controllers/returnController';
import { authenticateJwt, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateJwt);

router.get('/', requireRole('admin', 'cashier'), ReturnController.list);
router.get('/eligibility/:invoiceId', requireRole('admin', 'cashier'), ReturnController.getEligibility);
router.get('/:id', requireRole('admin', 'cashier'), ReturnController.getById);
router.post('/', requireRole('admin', 'cashier'), ReturnController.create);

export default router;
