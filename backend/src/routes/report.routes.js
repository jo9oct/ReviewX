import { Router } from 'express';

import {
  createReport,
  getReport,
  listReports,
} from '../controllers/report.controller.js';

const router = Router();

router.post(
  '/reviews/:reviewId/reports',
  createReport,
);

router.get(
  '/reviews/:reviewId/reports',
  listReports,
);

router.get(
  '/reports/:reportId',
  getReport,
);

export default router;