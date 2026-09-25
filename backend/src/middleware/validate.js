/**
 * Joi validation middleware factory.
 *
 * Returns a middleware that validates req.body, req.params, or req.query
 * against a provided Joi schema. On failure, throws an ApiError(422) with
 * field-level detail so the client knows exactly what to fix.
 *
 * Usage:
 *   import Joi from 'joi';
 *   import { validate } from '../middleware/validate.js';
 *
 *   const schema = Joi.object({ language: Joi.string().valid('ts','js').required() });
 *   router.post('/reviews', validate(schema), reviewController.create);
 *
 * @param {import('joi').Schema} schema  Joi schema to validate against
 * @param {'body'|'params'|'query'} [source='body']  Which part of req to validate
 */

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly:    false,   // collect ALL errors, not just the first
      stripUnknown:  true,    // remove fields not in the schema
      convert:       true,    // coerce types (string → number, etc.)
    });

    if (error) {
      const fieldErrors = error.details.map((d) => ({
        field:   d.context?.label ?? d.path.join('.'),
        message: d.message.replace(/['"]/g, ''),
      }));
      // Return the brief's error shape: { error: { message, code }, errors: [] }
      return res.status(422).json({
        error:  { message: 'Validation failed', code: 'VALIDATION_ERROR' },
        errors: fieldErrors,
      });
    }

    // Replace the raw input with the sanitised, coerced value
    req[source] = value;
    next();
  };
}
