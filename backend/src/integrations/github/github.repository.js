import {
  githubRequest,
} from './github.client.js';

import githubConfig from '../../config/github.config.js';

const supportedExtensions =
  new Set([
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.py',
    '.java',
    '.c',
    '.h',
    '.cpp',
    '.hpp',
    '.cc',
    '.go',
    '.php',
    '.cs',
    '.vue',
  ]);

const ignoredDirectories =
  new Set([
    'node_modules',
    '.git',
    'vendor',
    'dist',
    'build',
    'coverage',
    '.next',
    '__pycache__',
  ]);

const validateRepositoryInput = ({
  owner,
  name,
  ref,
}) => {
  if (
    typeof owner !== 'string' ||
    !owner.trim()
  ) {
    const error = new Error(
      'GitHub repository owner is required.',
    );

    error.code =
      'GITHUB_REPOSITORY_OWNER_REQUIRED';

    error.statusCode = 400;

    throw error;
  }

  if (
    typeof name !== 'string' ||
    !name.trim()
  ) {
    const error = new Error(
      'GitHub repository name is required.',
    );

    error.code =
      'GITHUB_REPOSITORY_NAME_REQUIRED';

    error.statusCode = 400;

    throw error;
  }

  if (
    ref !== undefined &&
    (
      typeof ref !== 'string' ||
      !ref.trim()
    )
  ) {
    const error = new Error(
      'GitHub repository ref is invalid.',
    );

    error.code =
      'GITHUB_REPOSITORY_REF_INVALID';

    error.statusCode = 400;

    throw error;
  }

  return {
    owner:
      owner.trim(),

    name:
      name.trim(),

    ref:
      ref?.trim() ||
      undefined,
  };
};

const getAuthenticatedGithubUser =
  async ({
    accessToken,
  }) => {
    return githubRequest({
      path:
        '/user',

      accessToken,
    });
  };

const listGithubRepositories =
  async ({
    accessToken,
    page = 1,
    perPage = 30,
  }) => {
    const normalizedPage =
      Math.max(
        1,
        Number(page) || 1,
      );

    const normalizedPerPage =
      Math.min(
        100,
        Math.max(
          1,
          Number(perPage) || 30,
        ),
      );

    return githubRequest({
      path:
        `/user/repos?page=${normalizedPage}&per_page=${normalizedPerPage}&sort=updated&direction=desc`,

      accessToken,
    });
  };

const listGithubBranches =
  async ({
    owner,
    name,
    accessToken,
    page = 1,
    perPage = 100,
  }) => {
    const repositoryInput =
      validateRepositoryInput({
        owner,
        name,
      });

    const normalizedPage =
      Math.max(
        1,
        Number(page) || 1,
      );

    const normalizedPerPage =
      Math.min(
        100,
        Math.max(
          1,
          Number(perPage) || 100,
        ),
      );

    return githubRequest({
      path:
        `/repos/${encodeURIComponent(
          repositoryInput.owner,
        )}/${encodeURIComponent(
          repositoryInput.name,
        )}/branches?page=${normalizedPage}&per_page=${normalizedPerPage}`,

      accessToken,
    });
  };

const getRepository = async ({
  owner,
  name,
  accessToken = null,
}) => {
  const repositoryInput =
    validateRepositoryInput({
      owner,
      name,
    });

  return githubRequest({
    path:
      `/repos/${encodeURIComponent(
        repositoryInput.owner,
      )}/${encodeURIComponent(
        repositoryInput.name,
      )}`,

    accessToken,
  });
};

const getTree = async ({
  owner,
  name,
  ref,
  accessToken = null,
}) => {
  const repositoryInput =
    validateRepositoryInput({
      owner,
      name,
      ref,
    });

  return githubRequest({
    path:
      `/repos/${encodeURIComponent(
        repositoryInput.owner,
      )}/${encodeURIComponent(
        repositoryInput.name,
      )}/git/trees/${encodeURIComponent(
        repositoryInput.ref,
      )}?recursive=1`,

    accessToken,
  });
};

const getBlob = async ({
  owner,
  name,
  sha,
  accessToken = null,
}) => {
  if (
    typeof sha !== 'string' ||
    !sha.trim()
  ) {
    const error = new Error(
      'GitHub blob SHA is required.',
    );

    error.code =
      'GITHUB_BLOB_SHA_REQUIRED';

    error.statusCode = 400;

    throw error;
  }

  const repositoryInput =
    validateRepositoryInput({
      owner,
      name,
    });

  return githubRequest({
    path:
      `/repos/${encodeURIComponent(
        repositoryInput.owner,
      )}/${encodeURIComponent(
        repositoryInput.name,
      )}/git/blobs/${encodeURIComponent(
        sha.trim(),
      )}`,

    accessToken,
  });
};

const hasSupportedExtension = (
  path,
) => {
  const normalized =
    path.toLowerCase();

  for (
    const extension
    of supportedExtensions
  ) {
    if (
      normalized.endsWith(
        extension,
      )
    ) {
      return true;
    }
  }

  return false;
};

const shouldIgnorePath = (
  path,
) => {
  const segments =
    path.split('/');

  return segments.some(
    (segment) =>
      ignoredDirectories.has(
        segment,
      ),
  );
};

const decodeBlob = (
  encoded,
) => {
  try {
    return Buffer.from(
      encoded,
      'base64',
    ).toString('utf8');
  } catch {
    return null;
  }
};

const getRepositorySource =
  async ({
    owner,
    name,
    ref,
    accessToken = null,
  }) => {
    const repositoryInput =
      validateRepositoryInput({
        owner,
        name,
        ref,
      });

    const repository =
      await getRepository({
        ...repositoryInput,
        accessToken,
      });

    const branch =
      repositoryInput.ref ||
      repository.default_branch;

    if (!branch) {
      const error = new Error(
        'GitHub repository default branch could not be determined.',
      );

      error.code =
        'GITHUB_DEFAULT_BRANCH_MISSING';

      error.statusCode = 502;

      throw error;
    }

    const tree =
      await getTree({
        owner:
          repositoryInput.owner,

        name:
          repositoryInput.name,

        ref:
          branch,

        accessToken,
      });

    if (
      !Array.isArray(tree?.tree)
    ) {
      const error = new Error(
        'GitHub repository tree is invalid.',
      );

      error.code =
        'INVALID_GITHUB_REPOSITORY_TREE';

      error.statusCode = 502;

      throw error;
    }

    const files = [];

    let totalBytes = 0;

    for (
      const entry
      of tree.tree
    ) {
      if (
        files.length >=
        githubConfig.maxFiles
      ) {
        break;
      }

      if (
        entry?.type !==
        'blob'
      ) {
        continue;
      }

      if (
        typeof entry.path !==
          'string' ||
        !entry.sha
      ) {
        continue;
      }

      if (
        shouldIgnorePath(
          entry.path,
        )
      ) {
        continue;
      }

      if (
        !hasSupportedExtension(
          entry.path,
        )
      ) {
        continue;
      }

      const blob =
        await getBlob({
          owner:
            repositoryInput.owner,

          name:
            repositoryInput.name,

          sha:
            entry.sha,

          accessToken,
        });

      const content =
        decodeBlob(
          blob?.content ||
            '',
        );

      if (
        content === null
      ) {
        continue;
      }

      const byteLength =
        Buffer.byteLength(
          content,
          'utf8',
        );

      if (
        byteLength >
        githubConfig.maxFileBytes
      ) {
        continue;
      }

      if (
        totalBytes +
          byteLength >
        githubConfig.maxTotalBytes
      ) {
        break;
      }

      files.push({
        path:
          entry.path,

        content,

        byteLength,
      });

      totalBytes +=
        byteLength;
    }

    return {
      sourceType:
        'github',

      repository: {
        owner:
          repositoryInput.owner,

        name:
          repositoryInput.name,

        ref:
          branch,

        defaultBranch:
          repository.default_branch,

        private:
          Boolean(
            repository.private,
          ),

        htmlUrl:
          repository.html_url,
      },

      files,

      totalFiles:
        files.length,

      totalBytes,
    };
  };

export {
  getAuthenticatedGithubUser,
  listGithubRepositories,
  listGithubBranches,
  getRepository,
  getTree,
  getBlob,
  getRepositorySource,
};

export default {
  getAuthenticatedGithubUser,
  listGithubRepositories,
  listGithubBranches,
  getRepository,
  getTree,
  getBlob,
  getRepositorySource,
};