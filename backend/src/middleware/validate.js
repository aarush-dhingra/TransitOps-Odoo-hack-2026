'use strict';

/**
 * Zod schema validation middleware factory.
 * Pass a Zod schema and the part of the request to validate.
 *
 * @param {import('zod').ZodTypeAny} schema - Zod schema to validate against
 * @param {'body' | 'query' | 'params'} [source='body']
 * @returns {import('express').RequestHandler}
 *
 * @example
 *   router.post('/vehicles', verifyToken, validate(createVehicleSchema), createVehicle);
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));

      return res.status(422).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed.',
          issues,
        },
      });
    }

    // Replace the raw request data with the parsed (coerced) value
    req[source] = result.data;
    return next();
  };
}

module.exports = validate;
