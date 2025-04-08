import { Router } from 'express';
import authRoutes from './auth.routes';
import degreeRoutes from './degree.routes';
import docsRoutes from './docs.routes';
import universityRoutes from './university.routes';
import userRoutes from './user.routes';

const router = Router();

// Mount the route modules
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/degree', degreeRoutes);
router.use('/university', universityRoutes);
router.use('/docs', docsRoutes);

// Special routes that don't fit the pattern
router.use('/', userRoutes);

export default router;
