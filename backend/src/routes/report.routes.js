// STATUS: UPDATED

import { Router } from 'express';

import {
  authenticate,
} from '../middleware/authenticate.js';

import {
  createReport,
  getReport,
  listReports,
} from '../controllers/report.controller.js';

const router = Router();

router.post(
  '/reviews/:reviewId/reports',
  authenticate,
  createReport,
);

router.get(
  '/reviews/:reviewId/reports',
  authenticate,
  listReports,
);

router.get(
  '/reports/:reportId',
  authenticate,
  getReport,
);

export default router;