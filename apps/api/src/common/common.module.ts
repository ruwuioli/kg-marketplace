import { Global, Module } from '@nestjs/common'

import { loadEnv } from '../config/env'
import { ENV_TOKEN } from '../config/env.token'

import { NotificationService } from './services/notification.service'
import { PasswordService } from './services/password.service'

@Global()
@Module({
  providers: [
    { provide: ENV_TOKEN, useFactory: loadEnv },
    PasswordService,
    NotificationService,
  ],
  exports: [ENV_TOKEN, PasswordService, NotificationService],
})
export class CommonModule {}
