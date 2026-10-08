// STATUS: UPDATED

import { Router } from 'express';

import { authenticate } from '../middleware/authenticate.js';

import {
  initiateProPayment,
  initiateEnterprisePayment,
  verifyPayment,
  handleChapaCallback,
} from '../controllers/payment.controller.js';

const router = Router();

/*
 * Pro subscription.
 *
 * Frontend sends only:
 * Authorization: Bearer <JWT>
 */
router.post(
  '/pro/initiate',
  authenticate,
  initiateProPayment,
);

/*
 * Enterprise subscription.
 *
 * Frontend sends only:
 * Authorization: Bearer <JWT>
 */
router.post(
  '/enterprise/initiate',
  authenticate,
  initiateEnterprisePayment,
);

/*
 * Public verification endpoint used when the
 * customer returns from Chapa checkout.
 */
router.get(
  '/verify/:txRef',
  verifyPayment,
);

/*
 * Public server-to-server callback. The payment
 * is trusted only after server-side verification.
 */
router.post(
  '/callback',
  handleChapaCallback,
);

export default router;