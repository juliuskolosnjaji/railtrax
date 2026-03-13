export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-3xl">🚂</span>
          <h1 className="mt-2 text-2xl font-bold text-white tracking-tight">RailPlanner</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
