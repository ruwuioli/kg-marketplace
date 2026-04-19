import { describe, it, expect, beforeEach, vi } from 'vitest'

import type { UsersService } from '../users/users.service'
import type { AuthUserPayload } from '../common/types/authenticated-request'

import { AuthController } from './auth.controller'
import type { AuthService } from './auth.service'

function makeSvc(): AuthService {
  return {
    register: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    requestPhoneVerify: vi.fn(),
    confirmPhoneVerify: vi.fn(),
    requestPasswordReset: vi.fn(),
    confirmPasswordReset: vi.fn(),
  } as unknown as AuthService
}

function makeUsers(): UsersService {
  return {
    findById: vi.fn().mockResolvedValue({ id: 'u1', phone: '+996700111222' }),
  } as unknown as UsersService
}

function asMock<T>(fn: T): ReturnType<typeof vi.fn> {
  return fn as unknown as ReturnType<typeof vi.fn>
}

const authUser: AuthUserPayload = { id: 'u1', email: 'a@example.com', role: 'BUYER' }

describe('AuthController', () => {
  let svc: AuthService
  let users: UsersService
  let controller: AuthController

  beforeEach(() => {
    svc = makeSvc()
    users = makeUsers()
    controller = new AuthController(svc, users)
  })

  it('register delegates to service', async () => {
    const response = { user: { id: 'u1' }, tokens: {} }
    asMock(svc.register).mockResolvedValue(response)
    const result = await controller.register({
      email: 'a@example.com',
      phone: '+996700111222',
      password: 'pa$$word1',
      firstName: 'A',
      lastName: 'B',
    })
    expect(svc.register).toHaveBeenCalled()
    expect(result).toBe(response)
  })

  it('login delegates to service', async () => {
    const response = { user: {}, tokens: {} }
    asMock(svc.login).mockResolvedValue(response)
    const result = await controller.login({ identifier: 'a@example.com', password: 'x' })
    expect(result).toBe(response)
  })

  it('refresh delegates to service and returns tokens', async () => {
    const tokens = { accessToken: 'a', refreshToken: 'r' }
    asMock(svc.refresh).mockResolvedValue(tokens)
    const result = await controller.refresh({ refreshToken: 'old' })
    expect(svc.refresh).toHaveBeenCalledWith('old')
    expect(result).toEqual({ tokens })
  })

  it('logout returns null', async () => {
    const result = await controller.logout({ refreshToken: 'r' })
    expect(svc.logout).toHaveBeenCalledWith('r')
    expect(result).toBeNull()
  })

  it('verify-phone request looks up phone and calls service', async () => {
    const result = await controller.requestPhoneVerify(authUser)
    expect(users.findById).toHaveBeenCalledWith('u1')
    expect(svc.requestPhoneVerify).toHaveBeenCalledWith('u1', '+996700111222')
    expect(result).toBeNull()
  })

  it('verify-phone confirm calls service with code', async () => {
    const result = await controller.confirmPhoneVerify(authUser, { code: '123456' })
    expect(svc.confirmPhoneVerify).toHaveBeenCalledWith('u1', '123456')
    expect(result).toBeNull()
  })

  it('password-reset request always returns null (no disclosure)', async () => {
    const result = await controller.requestPasswordReset({ email: 'a@example.com' })
    expect(svc.requestPasswordReset).toHaveBeenCalledWith('a@example.com')
    expect(result).toBeNull()
  })

  it('password-reset confirm returns null on success', async () => {
    const result = await controller.confirmPasswordReset({
      token: 'tok',
      newPassword: 'newpass1234',
    })
    expect(svc.confirmPasswordReset).toHaveBeenCalledWith('tok', 'newpass1234')
    expect(result).toBeNull()
  })
})
