import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import NavBar from '../components/NavBar'
import AvatarBadge from '../components/AvatarBadge'
import { searchProfiles } from '../lib/publicProfileApi'
import { SearchResult } from '../types'

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 300

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults(null)
      setError('')
      return
    }

    setLoading(true)
    setError('')
    const timer = window.setTimeout(() => {
      searchProfiles(trimmed)
        .then(setResults)
        .catch((err) => setError(err instanceof Error ? err.message : 'Search failed.'))
        .finally(() => setLoading(false))
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [query])

  return (
    <div className="min-h-screen bg-ink">
      <NavBar />

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
        <div>
          <h1 className="font-display text-xl text-paper">Search</h1>
          <p className="mt-1 text-sm text-mute">Find people by username, or by a subject they're publicly tracking.</p>
        </div>

        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Username or subject, e.g. Mathematics"
          className="rounded-md border border-ink-border bg-ink-panel px-4 py-3 text-paper outline-none focus:border-flow"
        />

        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}

        {loading && <p className="text-sm text-mute">Searching…</p>}

        {!loading && query.trim().length >= MIN_QUERY_LENGTH && results !== null && results.length === 0 && (
          <p className="rounded-lg border border-dashed border-ink-border p-6 text-center text-sm text-mute">
            No one found for "{query.trim()}".
          </p>
        )}

        {results && results.length > 0 && (
          <div className="flex flex-col gap-2">
            {results.map((result) => (
              <Link
                key={result.username}
                to={`/u/${encodeURIComponent(result.username)}`}
                className="flex items-center gap-3 rounded-lg border border-ink-border p-3 transition-colors hover:border-flow"
              >
                <AvatarBadge label={result.full_name ?? result.username} avatarUrl={result.avatar_url} />
                <div className="min-w-0">
                  <p className="truncate font-display text-paper">{result.full_name || `@${result.username}`}</p>
                  <p className="truncate text-xs text-mute">
                    @{result.username}
                    {result.matched_subject && <span> · matched "{result.matched_subject}"</span>}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
