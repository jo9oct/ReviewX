import AuditLog from '../models/auditLog.model.js';

const create = async (
  data
) => {
  return AuditLog.create(
    data
  );
};

const createMany = async (
  documents
) => {
  if (
    !Array.isArray(
      documents
    ) ||
    !documents.length
  ) {
    return [];
  }

  return AuditLog.insertMany(
    documents,
    {
      ordered:
        true
    }
  );
};

const findById = async (
  id
) => {
  return AuditLog.findById(
    id
  ).lean();
};

const findByResource = async (
  resourceType,
  resourceId
) => {
  return AuditLog.find({
    resourceType,
    resourceId
  })
    .sort({
      createdAt:
        -1
    })
    .lean();
};

const findRecent = async (
  limit = 100
) => {
  return AuditLog.find({})
    .sort({
      createdAt:
        -1
    })
    .limit(
      limit
    )
    .lean();
};

const findMany = async ({
  filter = {},
  limit = 100,
  skip = 0
} = {}) => {
  return AuditLog.find(
    filter
  )
    .sort({
      createdAt:
        -1
    })
    .skip(
      skip
    )
    .limit(
      limit
    )
    .lean();
};

export {
  create,
  createMany,
  findById,
  findByResource,
  findRecent,
  findMany
};