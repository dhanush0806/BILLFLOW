import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { authenticateJwt, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateJwt);

router.get('/', requireRole('admin', 'cashier'), ProductController.list);
router.get('/lookup/:code', requireRole('admin', 'cashier'), ProductController.lookupBarcode);
router.get('/:id', requireRole('admin', 'cashier'), ProductController.getById);
router.post('/', requireRole('admin'), ProductController.create);
router.post('/import-csv', requireRole('admin'), ProductController.importCsv);
router.put('/:id', requireRole('admin'), ProductController.update);
router.delete('/:id', requireRole('admin'), ProductController.archive);

export default router;
