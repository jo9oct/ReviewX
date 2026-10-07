import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    ownerId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },

    normalizedName: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    sourceType: {
      type: String,
      enum: ['paste', 'upload', 'archive', 'github'],
      required: true,
      index: true
    },

    repository: {
      provider: {
        type: String,
        enum: ['github'],
        default: null
      },

      owner: {
        type: String,
        default: null
      },

      name: {
        type: String,
        default: null
      },

      defaultBranch: {
        type: String,
        default: null
      }
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

projectSchema.index({
  normalizedName: 1,
  sourceType: 1
});

projectSchema.index({
  ownerId: 1,
  createdAt: -1
});

const Project = mongoose.model('Project', projectSchema);

export { Project };
export default Project;