import mongoose from 'mongoose';

const auditLogSchema =
  new mongoose.Schema(
    {
      actorId: {
        type:
          mongoose.Schema.Types.ObjectId,

        default:
          null,

        index:
          true
      },

      actorType: {
        type:
          String,

        enum: [
          'system',
          'user',
          'service'
        ],

        required:
          true,

        index:
          true
      },

      action: {
        type:
          String,

        required:
          true,

        trim:
          true,

        index:
          true
      },

      resourceType: {
        type:
          String,

        required:
          true,

        trim:
          true,

        index:
          true
      },

      resourceId: {
        type:
          String,

        default:
          null,

        index:
          true
      },

      status: {
        type:
          String,

        enum: [
          'success',
          'failure'
        ],

        required:
          true,

        index:
          true
      },

      metadata: {
        type:
          mongoose.Schema.Types.Mixed,

        default:
          {}
      },

      ipAddress: {
        type:
          String,

        default:
          null,

        trim:
          true
      },

      userAgent: {
        type:
          String,

        default:
          null,

        trim:
          true
      },

      requestId: {
        type:
          String,

        default:
          null,

        index:
          true
      }
    },
    {
      timestamps:
        true,

      versionKey:
        false
    }
  );

auditLogSchema.index({
  createdAt:
    -1
});

const AuditLog =
  mongoose.model(
    'AuditLog',
    auditLogSchema
  );

export default AuditLog;