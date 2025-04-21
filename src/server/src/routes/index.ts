import { Router } from 'express';
import authRoutes from './authentication.routes';
import credentialRoutes from './credential-management.routes';
import docsRoutes from './docs.routes';
import healthRoutes from './health.routes';
import issuerRoutes from './issuer-management.routes';
import userRoutes from './user-management.routes';

const router = Router();

// Mount the route modules
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/credential', credentialRoutes);
router.use('/issuer', issuerRoutes);
router.use('/docs', docsRoutes);

router.use('/status', healthRoutes);

// Special routes that don't fit the pattern
router.use('/', userRoutes);

export default router;
