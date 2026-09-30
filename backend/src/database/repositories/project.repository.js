import Project from '../models/project.model.js';

const create = async (data) => {
  return Project.create(data);
};

const findById = async (projectId) => {
  return Project.findById(
    projectId,
  ).lean();
};

const findByNormalizedName = async (
  normalizedName,
  sourceType,
) => {
  return Project.findOne({
    normalizedName,
    sourceType,
  }).lean();
};

const findByName = async (name) => {
  return Project.findOne({
    name,
  }).lean();
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

const projectRepository = Object.freeze({
  create,
  findById,
  findByNormalizedName,
  findByName,
  updateById,
});

export {
  create,
  findById,
  findByNormalizedName,
  findByName,
  updateById,
  projectRepository,
};

export default projectRepository;