import {
  sanitizeProjectName,
} from '../security/inputSanitizer.js';

const DEFAULT_PROJECT_NAME =
  'Untitled Project';

const normalizeProjectName = (
  projectName,
) => {
  const value =
    projectName === undefined
      ? DEFAULT_PROJECT_NAME
      : projectName;

  const sanitized =
    sanitizeProjectName(
      value,
    );

  return sanitized
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
};

const createProjectIdentity = (
  projectName,
) => {
  const normalizedName =
    normalizeProjectName(
      projectName,
    );

  return Object.freeze({
    name: normalizedName,
    normalizedName: normalizedName.toLowerCase(),
  });
};

export {
  DEFAULT_PROJECT_NAME,
  normalizeProjectName,
  createProjectIdentity,
};