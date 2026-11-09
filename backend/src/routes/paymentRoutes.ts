import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';
import { authenticateJwt, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { paymentSchema } from '../validators/schemas';

const router = Router();

router.use(authenticateJwt);

router.get('/', requireRole('admin', 'cashier'), PaymentController.list);
router.get('/:id', requireRole('admin', 'cashier'), PaymentController.getById);
router.get('/:id/receipt-pdf', requireRole('admin', 'cashier'), PaymentController.downloadReceiptPdf);
router.post('/', requireRole('admin', 'cashier'), validateRequest(paymentSchema), PaymentController.record);
router.post('/:id/reverse', requireRole('admin'), PaymentController.reverse);

export default router;
