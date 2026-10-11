// STATUS: UPDATED

import { Router } from 'express';

import { authenticate } from '../middleware/authenticate.js';

import {
  connectGithub,
  githubCallback,
  getGithubConnectionUser,
  getGithubRepositories,
  getGithubBranches,
  getGithubRepository,
  getGithubStatus,
  disconnectGithub,
} from '../controllers/github.controller.js';

const router = Router();

router.get(
  '/status',
  authenticate,
  getGithubStatus,
);

router.post(
  '/disconnect',
  authenticate,
  disconnectGithub,
);

router.get(
  '/connect',
  authenticate,
  connectGithub,
);

router.get(
  '/callback',
  githubCallback,
);

router.get(
  '/connections/:connectionId/user',
  authenticate,
  getGithubConnectionUser,
);

router.get(
  '/connections/:connectionId/repositories',
  authenticate,
  getGithubRepositories,
);

router.get(
  '/connections/:connectionId/repositories/:owner/:name/branches',
  authenticate,
  getGithubBranches,
);

router.get(
  '/connections/:connectionId/repositories/:owner/:name',
  authenticate,
  getGithubRepository,
);

export default router;