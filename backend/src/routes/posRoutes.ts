import { Router } from 'express';
import { PosController } from '../controllers/posController';
import { authenticateJwt, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateJwt);

router.post('/checkout', requireRole('admin', 'cashier'), PosController.checkout);

export default router;
