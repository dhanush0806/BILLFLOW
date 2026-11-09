import { Router } from 'express';
import { CatalogController } from '../controllers/catalogController';
import { authenticateJwt, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { productSchema, serviceSchema } from '../validators/schemas';

const router = Router();

router.use(authenticateJwt);
router.use(requireRole('admin'));

// Products
router.get('/products', CatalogController.listProducts);
router.post('/products', validateRequest(productSchema), CatalogController.createProduct);
router.put('/products/:id', validateRequest(productSchema.partial()), CatalogController.updateProduct);
router.delete('/products/:id', CatalogController.archiveProduct);

// Services
router.get('/services', CatalogController.listServices);
router.post('/services', validateRequest(serviceSchema), CatalogController.createService);
router.put('/services/:id', validateRequest(serviceSchema.partial()), CatalogController.updateService);
router.delete('/services/:id', CatalogController.archiveService);

export default router;
