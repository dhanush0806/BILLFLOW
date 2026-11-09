import { Router } from 'express';
import { CategoryController } from '../controllers/categoryController';
import { authenticateJwt, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateJwt);

router.get('/', requireRole('admin', 'cashier'), CategoryController.list);
router.post('/', requireRole('admin'), CategoryController.create);
router.put('/:id', requireRole('admin'), CategoryController.update);
router.delete('/:id', requireRole('admin'), CategoryController.delete);

export default router;
