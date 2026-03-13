'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

const PLANS = ['free', 'plus', 'pro'] as const

export function DevPlanSwitcher({ currentPlan }: { currentPlan: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function setPlan(plan: string) {
    setLoading(true)
    await fetch('/api/dev/set-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="rounded-xl border border-yellow-600/40 bg-yellow-950/30 p-4 mb-6">
      <p className="text-xs font-mono text-yellow-500 mb-3">⚙ DEV — plan switcher</p>
      <div className="flex gap-2">
        {PLANS.map((p) => (
          <button
            key={p}
            onClick={() => setPlan(p)}
            disabled={loading || p === currentPlan}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              p === currentPlan
                ? 'bg-yellow-500 text-zinc-900 cursor-default'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}
