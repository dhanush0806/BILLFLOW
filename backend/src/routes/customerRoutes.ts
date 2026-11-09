import { Router } from 'express';
import { CustomerController } from '../controllers/customerController';
import { authenticateJwt, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { customerSchema } from '../validators/schemas';

const router = Router();

router.use(authenticateJwt);

router.get('/', requireRole('admin', 'cashier'), CustomerController.list);
router.get('/:id', requireRole('admin', 'cashier'), CustomerController.getById);
router.post('/', requireRole('admin', 'cashier'), validateRequest(customerSchema), CustomerController.create);
router.put('/:id', requireRole('admin'), validateRequest(customerSchema.partial()), CustomerController.update);
router.delete('/:id', requireRole('admin'), CustomerController.delete);

export default router;
