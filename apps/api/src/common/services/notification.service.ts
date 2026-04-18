import { Injectable } from '@nestjs/common'

@Injectable()
export class NotificationService {
  sendSmsOtp(phone: string, code: string): Promise<void> {
    // eslint-disable-next-line no-console
    console.warn(`[SMS STUB] ${phone}: Your verification code is ${code}`)
    return Promise.resolve()
  }

  sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
    // eslint-disable-next-line no-console
    console.warn(`[EMAIL STUB] To ${email}: reset link ${resetUrl}`)
    return Promise.resolve()
  }
}
