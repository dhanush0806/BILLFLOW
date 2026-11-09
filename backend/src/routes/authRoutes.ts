import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { validateRequest } from '../middleware/validate';
import { authenticateJwt } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import {
  registerBusinessSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validators/schemas';

const router = Router();

router.post('/register', rateLimiter(20), validateRequest(registerBusinessSchema), AuthController.register);
router.post('/login', rateLimiter(30), validateRequest(loginSchema), AuthController.login);
router.post('/forgot-password', rateLimiter(15), validateRequest(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', rateLimiter(15), validateRequest(resetPasswordSchema), AuthController.resetPassword);

router.get('/me', authenticateJwt, AuthController.getMe);
router.post('/change-password', authenticateJwt, validateRequest(changePasswordSchema), AuthController.changePassword);

export default router;
