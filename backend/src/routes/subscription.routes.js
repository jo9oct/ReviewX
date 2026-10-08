// STATUS: CREATED

import { Router } from 'express';

import { authenticate } from '../middleware/authenticate.js';
import * as subscriptionCtrl from '../controllers/subscription.controller.js';

const router = Router();

router.get(
  '/',
  authenticate,
  subscriptionCtrl.getMySubscription,
);

export default router;