import { HealthResponseSchema, type HealthResponse } from '@kgm/types'

import { apiFetch } from '@/lib/api'

async function getHealth(): Promise<HealthResponse | { error: string }> {
  try {
    const raw = await apiFetch<unknown>('/health')
    return HealthResponseSchema.parse(raw)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'unknown' }
  }
}

export default async function HomePage() {
  const health = await getHealth()
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold">KG Marketplace</h1>
      <p className="text-slate-600">Monorepo spine is up. Phase 1 in progress.</p>
      <pre className="rounded-lg bg-slate-100 px-4 py-3 text-sm">
        {JSON.stringify(health, null, 2)}
      </pre>
    </main>
  )
}
