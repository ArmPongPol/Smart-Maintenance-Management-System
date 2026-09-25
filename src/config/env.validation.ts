import * as Joi from 'joi';
import { NodeEnv } from '../common/constants/enum';

// config files parse booleans with `=== 'true'`, so only accept lowercase 'true' / 'false'
const booleanString = () => Joi.boolean().sensitive();

// requires a unit: jsonwebtoken treats a bare numeric string as milliseconds
const ttlString = () =>
  Joi.string()
    .pattern(/^\d+[smhd]$/)
    .messages({
      'string.pattern.base': '{{#label}} must be a duration like 15m, 1h, 7d',
    });

export const envValidationSchema = Joi.object({
  // app
  NODE_ENV: Joi.string()
    .valid(...Object.values(NodeEnv))
    .default(NodeEnv.DEVELOPMENT),
  APP_NAME: Joi.string().allow(''),
  PORT: Joi.number().port(),
  API_PREFIX: Joi.string().allow(''),
  API_VERSION: Joi.string().allow(''),
  CORS_ORIGINS: Joi.string().allow(''),
  CORS_CREDENTIALS: booleanString(),

  // database
  HOST: Joi.string().hostname().required(),
  DATABASE_PORT: Joi.number().port(),
  DATABASE_USERNAME: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_DATABASE: Joi.string().required(),
  DATABASE_SYNCHRONIZE: booleanString().when('NODE_ENV', {
    is: NodeEnv.PRODUCTION,
    then: Joi.valid(false).messages({
      'any.only':
        'DATABASE_SYNCHRONIZE must never be enabled in production. Use migrations',
    }),
  }),
  DB_LOGGING: booleanString(),
  DATABASE_SSL: booleanString(),
  DATABASE_SSL_REJECT_UNAUTHORIZED: booleanString(),

  // docs
  DOCS_ENABLED: booleanString(),
  DOCS_PATH: Joi.string().allow(''),
  DOCS_DESCRIPTION: Joi.string().allow(''),

  // jwt
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .required()
    .invalid(Joi.ref('JWT_ACCESS_SECRET'))
    .messages({
      'any.invalid': 'JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET',
    }),
  JWT_ACCESS_TTL: ttlString(),
  JWT_REFRESH_TTL: ttlString(),
  JWT_ISSUER: Joi.string(),
  JWT_AUDIENCE: Joi.string(),
});
