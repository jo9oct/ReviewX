import {
  deleteReviewSource,
} from '../queue/reviewSource.store.js';

const SUPPORTED_RESOURCE_TYPES =
  Object.freeze([
    'review-source',
  ]);

const normalizeCleanupData = ({
  resourceType,
  resourceId,
}) => {
  if (
    typeof resourceType !== 'string' ||
    !resourceType.trim()
  ) {
    throw new TypeError(
      'Cleanup resource type is required.',
    );
  }

  if (
    typeof resourceId !== 'string' ||
    !resourceId.trim()
  ) {
    throw new TypeError(
      'Cleanup resource ID is required.',
    );
  }

  const normalizedResourceType =
    resourceType.trim();

  if (
    !SUPPORTED_RESOURCE_TYPES.includes(
      normalizedResourceType,
    )
  ) {
    throw new TypeError(
      `Unsupported cleanup resource type: ${normalizedResourceType}.`,
    );
  }

  return {
    resourceType:
      normalizedResourceType,

    resourceId:
      resourceId.trim(),
  };
};

const cleanup = async ({
  resourceType,
  resourceId,
}) => {
  const data =
    normalizeCleanupData({
      resourceType,
      resourceId,
    });

  if (
    data.resourceType ===
    'review-source'
  ) {
    const deleted =
      await deleteReviewSource(
        data.resourceId,
      );

    return {
      resourceType:
        data.resourceType,

      resourceId:
        data.resourceId,

      deleted:
        deleted > 0,
    };
  }

  throw new TypeError(
    `Unsupported cleanup resource type: ${data.resourceType}.`,
  );
};

const cleanupService =
  Object.freeze({
    cleanup,
  });

export {
  cleanup,
};

export default cleanupService;
