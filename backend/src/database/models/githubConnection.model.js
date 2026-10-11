import mongoose from 'mongoose';

const githubConnectionSchema = new mongoose.Schema(
  {
    connectionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    tokenType: {
      type: String,
      default: 'bearer',
    },
    scope: {
      type: String,
      default: '',
    },
    githubUser: {
      id: Number,
      login: String,
      name: String,
      avatarUrl: String,
      htmlUrl: String,
    },
  },
  {
    timestamps: true,
  },
);

// Retain connection for 7 days
githubConnectionSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60 },
);

export const GithubConnection =
  mongoose.models.GithubConnection ||
  mongoose.model('GithubConnection', githubConnectionSchema);
