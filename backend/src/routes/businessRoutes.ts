import { Router } from 'express';
import { BusinessController } from '../controllers/businessController';
import { authenticateJwt, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import {
  businessProfileSchema,
  invoiceSettingsSchema,
  businessSetupSchema,
} from '../validators/schemas';

const router = Router();

router.use(authenticateJwt);
router.use(requireRole('admin'));

router.get('/profile', BusinessController.getProfile);
router.put('/profile', validateRequest(businessProfileSchema), BusinessController.updateProfile);
router.get('/settings', BusinessController.getSettings);
router.put('/settings', validateRequest(invoiceSettingsSchema), BusinessController.updateSettings);
router.post('/setup-wizard', validateRequest(businessSetupSchema), BusinessController.completeSetupWizard);

export default router;
