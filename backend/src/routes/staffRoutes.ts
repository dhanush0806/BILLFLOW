import { Router } from 'express';
import { StaffController } from '../controllers/staffController';
import { authenticateJwt, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticateJwt);
router.use(requireRole('admin'));

router.get('/', StaffController.list);
router.post('/', StaffController.create);
router.put('/:id/status', StaffController.updateStatus);
router.get('/activities', StaffController.getActivityLogs);

export default router;
