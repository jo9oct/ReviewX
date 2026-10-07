import Project from '../models/project.model.js';

const create = async (
  data,
) => {
  return Project.create(
    data,
  );
};

const findById = async (
  projectId,
) => {
  return Project.findById(
    projectId,
  ).lean();
};

const findByNormalizedName = async (
  normalizedName,
  sourceType,
  ownerId,
) => {
  return Project.findOne({
    normalizedName,
    sourceType,
    ownerId,
  }).lean();
};

const findByName = async (
  name,
) => {
  return Project.findOne({
    name,
  }).lean();
};

const findMany = async (
  filter = {},
  options = {},
) => {
  const {
    limit = 50,
    skip = 0,
  } = options;

  return Project.find(
    filter,
  )
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .lean();
};

const updateById = async (
  projectId,
  update,
) => {
  return Project.findByIdAndUpdate(
    projectId,
    {
      $set: update,
    },
    {
      new: true,
      runValidators: true,
      lean: true,
    },
  );
};

const projectRepository =
  Object.freeze({
    create,
    findById,
    findByNormalizedName,
    findByName,
    findMany,
    updateById,
  });

export {
  create,
  findById,
  findByNormalizedName,
  findByName,
  findMany,
  updateById,
  projectRepository,
};

export default projectRepository;