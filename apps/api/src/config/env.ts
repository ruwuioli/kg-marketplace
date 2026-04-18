import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(12),
  OTP_REQUEST_COOLDOWN_SECONDS: z.coerce.number().int().nonnegative().default(60),
  OTP_VERIFY_EXPIRES_MINUTES: z.coerce.number().int().positive().default(10),
  OTP_MAX_CONFIRM_ATTEMPTS: z.coerce.number().int().positive().default(5),
  PASSWORD_RESET_EXPIRES_MINUTES: z.coerce.number().int().positive().default(30),
  WEB_PUBLIC_URL: z.string().url().default('http://localhost:3000'),
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_USE_SSL: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  MINIO_ACCESS_KEY: z.string().default('minioadmin'),
  MINIO_SECRET_KEY: z.string().default('minioadmin'),
  MINIO_BUCKET: z.string().default('kgm-media'),
  MINIO_PUBLIC_URL: z.string().url().default('http://localhost:9000/kgm-media'),
})

export type Env = z.infer<typeof EnvSchema>

export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors)
    throw new Error('Environment validation failed')
  }
  return parsed.data
}
