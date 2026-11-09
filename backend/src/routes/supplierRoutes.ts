import { Router } from 'express';
import { SupplierController } from '../controllers/supplierController';
import { authenticateJwt, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateJwt);
router.use(requireRole('admin'));

router.get('/', SupplierController.list);
router.get('/:id', SupplierController.getById);
router.get('/:id/payments', SupplierController.getPayments);
router.post('/', SupplierController.create);
router.post('/:id/payments', SupplierController.recordPayment);
router.put('/:id', SupplierController.update);
router.delete('/:id', SupplierController.archive);

export default router;
