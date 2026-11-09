import { Router } from 'express';
import { ExpenseController } from '../controllers/expenseController';
import { authenticateJwt, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { expenseSchema } from '../validators/schemas';

const router = Router();

router.use(authenticateJwt);
router.use(requireRole('admin'));

router.get('/', ExpenseController.list);
router.get('/:id', ExpenseController.getById);
router.post('/', validateRequest(expenseSchema), ExpenseController.create);
router.put('/:id', validateRequest(expenseSchema.partial()), ExpenseController.update);
router.delete('/:id', ExpenseController.delete);

export default router;
