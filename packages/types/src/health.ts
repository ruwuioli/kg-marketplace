import { z } from 'zod'

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string().datetime(),
  uptime: z.number().nonnegative(),
})

export type HealthResponse = z.infer<typeof HealthResponseSchema>
