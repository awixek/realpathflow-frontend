import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ProfileSkeleton } from '../components/LoadingState'
import { getPublicProfile } from '../lib/publicProfileApi'
import { friendlyError } from '../lib/errorMessages'
import { PublicProfile, PublicTask } from '../types'
import { minutesToLabel } from '../lib/time'

function PublicTaskCard({ task }: { task: PublicTask }) {
  const statusLabel = task.status.charAt(0).toUpperCase() + task.status.slice(1)
  return (
    <article className="rounded-lg border border-ink-border bg-ink-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-paper">{task.name}</h2>
          {task.subject && <p className="mt-1 text-sm text-mute">{task.subject}</p>}
        </div>
        <span className="rounded-full border border-ink-border px-2.5 py-1 text-xs text-mute">
          {statusLabel}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div><p className="text-mute">Start</p><p className="mt-1 text-paper">{task.start_date}</p></div>
        <div><p className="text-mute">End</p><p className="mt-1 text-paper">{task.end_date}</p></div>
        <div><p className="text-mute">Daily goal</p><p className="mt-1 text-paper">{minutesToLabel(task.daily_minutes)}</p></div>
      </div>
    </article>
  )
}

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!username) return
    setError('')
    setProfile(null)
    getPublicProfile(username)
      .then(setProfile)
      .catch((err) => setError(friendlyError(err, 'This public profile could not be found.')))
  }, [username])

  if (error) {
    return (
      <main className="min-h-screen bg-ink px-6 py-16">
        <div className="mx-auto max-w-xl text-center">
          <p className="font-display text-xl text-paper">Public profile unavailable</p>
          <p className="mt-2 text-sm text-mute">{error}</p>
          <Link to="/" className="mt-6 inline-block rounded-md border border-ink-border px-4 py-2 text-sm text-paper hover:border-flow">
            Open RealPathFlow
          </Link>
        </div>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-ink px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <ProfileSkeleton />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-ink px-6 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="border-b border-ink-border pb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-flow">RealPathFlow</p>
          <h1 className="mt-2 font-display text-3xl text-paper">
            {profile.full_name || `@${profile.username}`}
          </h1>
          <p className="mt-1 text-sm text-mute">@{profile.username}</p>
          <p className="mt-4 text-sm text-mute">Public tasks</p>
        </header>

        <section className="grid gap-4">
          {profile.tasks.map((task) => <PublicTaskCard key={task.id} task={task} />)}
        </section>
      </div>
    </main>
  )
}
