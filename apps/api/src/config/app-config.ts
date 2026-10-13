import { z } from 'zod';

const bool = z.stringbool({ truthy: ['true', '1', 'yes'], falsy: ['false', '0', 'no'] });

// Parsed once at boot; the app refuses to start if anything is missing or malformed.
const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    LOG_PRETTY: bool.default(false),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:3000')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),

    /** Serve Swagger UI at /docs (+ /docs/openapi.json). Defaults to on outside production. */
    API_DOCS_ENABLED: bool.optional(),
    /** Reverse proxies in front of the API whose X-Forwarded-For we trust (the web BFF = 1). */
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),

    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),

    JWT_SECRET: z.string().min(32, { error: 'JWT_SECRET must be at least 32 characters' }),
    JWT_TTL_SECONDS: z.coerce.number().int().min(60).max(86_400).default(1800),
    JWT_ISSUER: z.string().default('patients-api'),
    JWT_AUDIENCE: z.string().default('patients-web'),
    BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(12),

    THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
    THROTTLE_LIMIT: z.coerce.number().int().positive().default(300),
    THROTTLE_LOGIN_LIMIT: z.coerce.number().int().positive().default(10),

    CHAOS_ENABLED: bool.default(false),
    CHAOS_FAILURE_RATE: z.coerce.number().min(0).max(1).default(0.15),
    CHAOS_LATENCY_MIN_MS: z.coerce.number().int().min(0).default(50),
    CHAOS_LATENCY_MAX_MS: z.coerce.number().int().min(0).default(500),
    DB_RETRY_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
    DB_RETRY_BASE_DELAY_MS: z.coerce.number().int().min(0).default(50),
  })
  .refine((env) => env.CHAOS_LATENCY_MIN_MS <= env.CHAOS_LATENCY_MAX_MS, {
    error: 'CHAOS_LATENCY_MIN_MS must be <= CHAOS_LATENCY_MAX_MS',
    path: ['CHAOS_LATENCY_MIN_MS'],
  });

export interface AppConfig {
  env: 'development' | 'test' | 'production';
  port: number;
  log: { level: string; pretty: boolean };
  corsOrigins: string[];
  trustProxyHops: number;
  apiDocsEnabled: boolean;
  databaseUrl: string;
  auth: {
    jwtSecret: string;
    ttlSeconds: number;
    issuer: string;
    audience: string;
    bcryptCost: number;
  };
  throttle: { ttlMs: number; limit: number; loginLimit: number };
  chaos: { enabled: boolean; failureRate: number; minLatencyMs: number; maxLatencyMs: number };
  retry: { maxAttempts: number; baseDelayMs: number };
}

export const APP_CONFIG = Symbol('APP_CONFIG');

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }
  const env = result.data;
  return {
    env: env.NODE_ENV,
    port: env.PORT,
    log: { level: env.LOG_LEVEL, pretty: env.LOG_PRETTY },
    corsOrigins: env.CORS_ORIGINS,
    trustProxyHops: env.TRUST_PROXY_HOPS,
    apiDocsEnabled: env.API_DOCS_ENABLED ?? env.NODE_ENV !== 'production',
    databaseUrl: env.DATABASE_URL,
    auth: {
      jwtSecret: env.JWT_SECRET,
      ttlSeconds: env.JWT_TTL_SECONDS,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      bcryptCost: env.BCRYPT_COST,
    },
    throttle: {
      ttlMs: env.THROTTLE_TTL_SECONDS * 1000,
      limit: env.THROTTLE_LIMIT,
      loginLimit: env.THROTTLE_LOGIN_LIMIT,
    },
    chaos: {
      enabled: env.CHAOS_ENABLED,
      failureRate: env.CHAOS_FAILURE_RATE,
      minLatencyMs: env.CHAOS_LATENCY_MIN_MS,
      maxLatencyMs: env.CHAOS_LATENCY_MAX_MS,
    },
    retry: { maxAttempts: env.DB_RETRY_MAX_ATTEMPTS, baseDelayMs: env.DB_RETRY_BASE_DELAY_MS },
  };
}
