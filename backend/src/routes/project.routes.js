import {
  Router,
} from 'express';

import {
  getProjects,
} from '../controllers/project.controller.js';

import {
  accessMiddleware,
} from '../middleware/access.middleware.js';

const router =
  Router();

router.get(
  '/',
  accessMiddleware(),
  getProjects,
);

export default router;