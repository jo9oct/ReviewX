// STATUS: UPDATED

import {
  Router,
} from 'express';

import {
  authenticate,
} from '../middleware/authenticate.js';

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
  authenticate,
  accessMiddleware(),
  getProjects,
);

export default router;