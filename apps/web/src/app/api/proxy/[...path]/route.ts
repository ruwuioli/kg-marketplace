import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const API_INTERNAL = process.env.API_INTERNAL_URL ?? 'http://localhost:3001/api/v1'

async function forward(req: NextRequest, pathSegments: string[]): Promise<NextResponse> {
  const targetUrl = `${API_INTERNAL}/${pathSegments.join('/')}${req.nextUrl.search}`
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('kgm_access')?.value

  const headers = new Headers()
  const contentType = req.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)
  if (accessToken) headers.set('authorization', `Bearer ${accessToken}`)

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: 'no-store',
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer()
  }

  const res = await fetch(targetUrl, init)
  const body = await res.arrayBuffer()
  const responseHeaders = new Headers()
  const respContentType = res.headers.get('content-type')
  if (respContentType) responseHeaders.set('content-type', respContentType)
  return new NextResponse(body, { status: res.status, headers: responseHeaders })
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  return forward(req, path)
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  return forward(req, path)
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  return forward(req, path)
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  return forward(req, path)
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  return forward(req, path)
}
