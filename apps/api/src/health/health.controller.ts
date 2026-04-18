import { Controller, Get } from '@nestjs/common'

import type { HealthResponse } from '@kgm/types'

@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }
  }
}
