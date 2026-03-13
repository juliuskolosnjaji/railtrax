import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white">
      <div className="text-center space-y-6">
        <div className="flex items-center justify-center gap-2">
          <span className="text-4xl">🚂</span>
          <h1 className="text-5xl font-bold tracking-tight">RailPlanner</h1>
        </div>
        <p className="text-zinc-400 text-lg max-w-md">
          Plan, visualise, and document your European train journeys.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="rounded-md bg-white px-6 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-md border border-zinc-700 px-6 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-900 transition-colors"
          >
            Create account
          </Link>
        </div>
      </div>
    </main>
  )
}
