import { Router } from 'express';
import { InvoiceController } from '../controllers/invoiceController';
import { authenticateJwt, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { invoiceSchema } from '../validators/schemas';

const router = Router();

router.use(authenticateJwt);

router.get('/', requireRole('admin', 'cashier'), InvoiceController.list);
router.get('/:id', requireRole('admin', 'cashier'), InvoiceController.getById);
router.get('/:id/pdf', requireRole('admin', 'cashier'), InvoiceController.downloadPdf);
router.post('/preview-calculation', requireRole('admin', 'cashier'), InvoiceController.previewCalculation);
router.post('/', requireRole('admin', 'cashier'), validateRequest(invoiceSchema), InvoiceController.create);
router.post('/:id/issue', requireRole('admin'), InvoiceController.issue);
router.post('/:id/cancel', requireRole('admin'), InvoiceController.cancel);

export default router;
