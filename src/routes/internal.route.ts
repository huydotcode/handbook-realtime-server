import { Router } from 'express';
import { InternalController } from '../controllers/internal.controller';

const router = Router();

router.post('/events', InternalController.emitEvent);

export default router;
