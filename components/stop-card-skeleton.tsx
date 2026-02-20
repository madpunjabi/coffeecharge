export function StopCardSkeleton() {
  return (
    <div className="w-full rounded-2xl border border-border bg-card p-4 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-4 w-48 rounded bg-muted" />
          <div className="h-3 w-32 rounded bg-muted" />
        </div>
        <div className="h-12 w-12 rounded-xl bg-muted" />
      </div>
      <div className="mt-3 flex gap-3">
        <div className="h-4 w-20 rounded bg-muted" />
        <div className="h-4 w-20 rounded bg-muted" />
      </div>
    </div>
  )
}
