import { Router } from 'express';

import {
  connectGithub,
  githubCallback,
  getGithubConnectionUser,
  getGithubRepositories,
  getGithubBranches,
  getGithubRepository,
} from '../controllers/github.controller.js';

const router = Router();

router.get(
  '/connect',
  connectGithub,
);

router.get(
  '/callback',
  githubCallback,
);

router.get(
  '/connections/:connectionId/user',
  getGithubConnectionUser,
);

router.get(
  '/connections/:connectionId/repositories',
  getGithubRepositories,
);

router.get(
  '/connections/:connectionId/repositories/:owner/:name/branches',
  getGithubBranches,
);

router.get(
  '/connections/:connectionId/repositories/:owner/:name',
  getGithubRepository,
);

export default router;