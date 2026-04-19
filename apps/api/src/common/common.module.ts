import { Global, Module } from '@nestjs/common'

import { ENV_TOKEN } from '../config/env.token'
import { loadEnv } from '../config/env'

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
