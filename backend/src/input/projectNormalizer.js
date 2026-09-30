import {
  sanitizeProjectName
} from '../security/inputSanitizer.js';

const normalizeProjectName = (projectName) => {
  const sanitized = sanitizeProjectName(projectName);

  return sanitized
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
};

const createProjectIdentity = (projectName) => {
  const normalizedName = normalizeProjectName(projectName);

  return Object.freeze({
    name: normalizedName,
    normalizedName: normalizedName.toLowerCase()
  });
};

export {
  normalizeProjectName,
  createProjectIdentity
};