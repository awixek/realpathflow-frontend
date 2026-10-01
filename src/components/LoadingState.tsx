import { motion } from 'framer-motion'

function Shimmer({ className }: { className: string }) {
  return (
    <motion.div
      aria-hidden="true"
      className={`relative overflow-hidden rounded-md bg-ink-border/60 ${className}`}
      animate={{ opacity: [0.55, 0.9, 0.55] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

export function TaskSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3 rounded-lg border border-ink-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Shimmer className="h-5 w-2/3" />
          <Shimmer className="h-3 w-1/3" />
        </div>
        <Shimmer className="h-5 w-20 rounded-full" />
      </div>
      <div className="flex gap-3">
        <Shimmer className="h-3 w-28" />
        <Shimmer className="h-3 w-20" />
        <Shimmer className="h-3 w-24" />
      </div>
      <div className="flex gap-2 pt-1">
        <Shimmer className="h-8 w-16" />
        <Shimmer className="h-8 w-16" />
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10" aria-label="Loading today">
      <section className="rounded-lg border border-ink-border p-6">
        <div className="flex items-center gap-4">
          <Shimmer className="h-16 w-16 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Shimmer className="h-5 w-40" />
            <Shimmer className="h-3 w-56 max-w-full" />
          </div>
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Shimmer className="h-5 w-32" />
          <Shimmer className="h-4 w-20" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TaskSkeleton />
          <TaskSkeleton />
        </div>
      </section>
    </main>
  )
}

export function ProfileSkeleton() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10" aria-label="Loading profile">
      <section className="rounded-lg border border-ink-border p-6 text-center">
        <Shimmer className="mx-auto h-4 w-44" />
        <Shimmer className="mx-auto mt-3 h-10 w-32" />
        <div className="mt-5 flex justify-center gap-6">
          <Shimmer className="h-4 w-20" />
          <Shimmer className="h-4 w-24" />
          <Shimmer className="h-4 w-20" />
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <Shimmer className="h-5 w-28" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TaskSkeleton />
          <TaskSkeleton />
        </div>
      </section>
    </main>
  )
}

export default function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-24 text-center" role="status" aria-live="polite">
      <div className="h-2 w-32 overflow-hidden rounded-full bg-ink-border">
        <motion.div
          className="h-full w-1/2 rounded-full bg-flow"
          animate={{ x: ['-100%', '220%'] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
      <p className="text-sm text-mute">{label}</p>
    </div>
  )
}
