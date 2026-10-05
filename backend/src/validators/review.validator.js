import Joi from 'joi';

const sourceTypeSchema =
  Joi.string()
    .valid(
      'paste',
      'upload',
      'archive',
      'github',
    )
    .required();

const githubRepositorySchema =
  Joi.object({
    owner:
      Joi.string()
        .trim()
        .min(1)
        .max(100)
        .required(),

    name:
      Joi.string()
        .trim()
        .min(1)
        .max(100)
        .required(),

    ref:
      Joi.string()
        .trim()
        .max(255)
        .optional(),
  })
    .required()
    .unknown(false);

const sourceFileSchema =
  Joi.object({
    path:
      Joi.string()
        .trim()
        .min(1)
        .max(512)
        .optional(),

    filename:
      Joi.string()
        .trim()
        .min(1)
        .max(512)
        .optional(),

    content:
      Joi.string()
        .required(),
  })
    .unknown(false)
    .custom((file, helpers) => {
      if (!file.path && !file.filename) {
        return helpers.error('any.custom');
      }

      return file;
    })
    .messages({
      'any.custom':
        'Each source file must contain either path or filename.',
    });

const sourceSchema =
  Joi.object({
    type:
      sourceTypeSchema,

    connectionId:
      Joi.string()
        .trim()
        .min(1)
        .max(128)
        .when('type', {
          is: 'github',

          then:
            Joi.required(),

          otherwise:
            Joi.forbidden(),
        }),

    content:
      Joi.string()
        .max(10 * 1024 * 1024)
        .when('type', {
          is: 'paste',

          then:
            Joi.required(),

          otherwise:
            Joi.forbidden(),
        }),

    filename:
      Joi.string()
        .trim()
        .min(1)
        .max(512)
        .when('type', {
          is: Joi.valid(
            'upload',
            'archive',
          ),

          then:
            Joi.required(),

          otherwise:
            Joi.optional(),
        }),

    path:
      Joi.string()
        .trim()
        .max(512)
        .optional(),

    files:
      Joi.array()
        .items(sourceFileSchema)
        .when('type', {
          is: 'upload',

          then:
            Joi.array()
              .items(sourceFileSchema)
              .min(1)
              .required(),

          otherwise:
            Joi.when('type', {
              is: 'archive',

              then:
                Joi.array()
                  .items(sourceFileSchema)
                  .min(0)
                  .optional(),

              otherwise:
                Joi.forbidden(),
            }),
        }),

    repository:
      githubRepositorySchema
        .when('type', {
          is: 'github',

          then:
            Joi.required(),

          otherwise:
            Joi.forbidden(),
        }),
  })
    .required()
    .unknown(false);

const reviewSchema =
  Joi.object({
    projectName:
      Joi.string()
        .trim()
        .min(1)
        .max(200)
        .required(),

    source:
      sourceSchema.required(),

    options:
      Joi.object({
        aiAnalysis:
          Joi.boolean()
            .default(false),

        aiRemediation:
          Joi.boolean()
            .default(false),

        advancedAnalysis:
          Joi.boolean()
            .default(false),
      })
        .default({})
        .unknown(false),
  })
    .required()
    .unknown(false);

const validateReviewRequest =
  (payload) => {
    return reviewSchema.validate(
      payload,
      {
        abortEarly:
          false,

        allowUnknown:
          false,

        stripUnknown:
          false,
      },
    );
  };

export {
  githubRepositorySchema,
  sourceFileSchema,
  sourceSchema,
  reviewSchema,
  validateReviewRequest,
};

export default reviewSchema;