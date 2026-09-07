import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { AdaptiveStrategy, applyRoadmapEdit, fetchRoadmapVersions, previewAdaptiveReplan, previewRoadmapEdit, RoadmapEditPreview, restoreRoadmapVersion } from '../lib/roadmapApi'

function mins(v: unknown) {
  const n = Number(v ?? 0)
  return `${Math.floor(n / 60)}h ${Math.round(n % 60)}m`
}

export default function RoadmapEditPage() {
  const { roadmapId = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const adaptiveMode = searchParams.get('adaptive') === '1'
  const initialStrategy = (searchParams.get('strategy') as AdaptiveStrategy | null) ?? 'KEEP_DEADLINE'
  const [adaptiveStrategy, setAdaptiveStrategy] = useState<AdaptiveStrategy>(initialStrategy)
  const [targetDailyMinutes, setTargetDailyMinutes] = useState(240)
  const [targetDeadline, setTargetDeadline] = useState('')
  const [request, setRequest] = useState('')
  const [preview, setPreview] = useState<RoadmapEditPreview | null>(null)
  const [versions, setVersions] = useState<{ version_number: number; schema_payload: Record<string, unknown> }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState<number | null>(null)
  const [viewVersion, setViewVersion] = useState<number | null>(null)

  useEffect(() => {
    if (!roadmapId) return
    fetchRoadmapVersions(roadmapId).then(setVersions).catch(() => undefined)
  }, [roadmapId, applied])

  async function handlePreview() {
    if (!request.trim() || loading) return
    setLoading(true); setError(null); setApplied(null)
    try { setPreview(await previewRoadmapEdit(roadmapId, request)) }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not generate an edit preview.') }
    finally { setLoading(false) }
  }

  async function handleApply() {
    if (!preview || !preview.can_apply || loading) return
    setLoading(true); setError(null)
    try {
      const result = await applyRoadmapEdit(roadmapId, preview.base_version, preview.proposal as Record<string, unknown>, preview.approval_token, crypto.randomUUID())
      setApplied(result.version_number)
      setPreview(null)
      setRequest('')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not apply the roadmap edit.') }
    finally { setLoading(false) }
  }

  async function handleRestore(version: number) {
    if (loading || !window.confirm(`Restore v${version}? This creates a new version; it does not erase history.`)) return
    setLoading(true); setError(null)
    try {
      const result = await restoreRoadmapVersion(roadmapId, version, crypto.randomUUID())
      setApplied(result.version_number)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not restore this version.') }
    finally { setLoading(false) }
  }

  const impact = preview?.impact
  const latestVersion = versions.length > 0 ? versions[versions.length - 1].version_number : '—'

  return <div className="min-h-screen"><NavBar /><div className="mx-auto max-w-4xl px-6 py-10">
    <button onClick={() => navigate('/')} className="text-xs text-mute hover:text-paper">← Back to Today</button>
    <div className="mt-5 flex items-start justify-between gap-4"><div><h1 className="font-display text-2xl text-paper">Edit roadmap with AI</h1><p className="mt-1 text-sm text-mute">AI proposes. You review. Core Architect validates. Only Apply Changes writes a new version.</p></div><span className="rounded-full border border-ink-border px-3 py-1 text-xs text-mute">v{preview?.base_version ?? latestVersion}</span></div>

    {adaptiveMode && <div className="mt-6 rounded-xl border border-flow/30 bg-ink-panel p-5">
      <p className="text-xs uppercase tracking-wider text-flow">Adaptive replanning</p>
      <h2 className="mt-1 font-display text-lg text-paper">Rebalance from real execution</h2>
      <p className="mt-1 text-sm text-mute">Past execution is evidence, not something AI can rewrite. Review the proposed new version before anything is saved.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {([['KEEP_DEADLINE','Keep deadline'],['REDUCE_SCOPE','Reduce scope'],['INCREASE_DAILY_TIME','Increase daily time'],['EXTEND_DEADLINE','Extend deadline']] as const).map(([value,label]) => (
          <button key={value} onClick={() => setAdaptiveStrategy(value)} className={`rounded-md border px-3 py-2 text-left text-sm ${adaptiveStrategy === value ? 'border-flow bg-flow/10 text-flow' : 'border-ink-border text-paper'}`}>{label}</button>
        ))}
      </div>
      {adaptiveStrategy === 'INCREASE_DAILY_TIME' && <label className="mt-4 block text-xs text-mute">New daily target (minutes)
        <input type="number" min={15} max={1440} value={targetDailyMinutes} onChange={e => setTargetDailyMinutes(Number(e.target.value))} className="mt-1 block w-full rounded-md border border-ink-border bg-ink-panel px-3 py-2 text-sm text-paper" />
      </label>}
      {adaptiveStrategy === 'EXTEND_DEADLINE' && <label className="mt-4 block text-xs text-mute">New deadline
        <input type="date" value={targetDeadline} onChange={e => setTargetDeadline(e.target.value)} className="mt-1 block w-full rounded-md border border-ink-border bg-ink-panel px-3 py-2 text-sm text-paper" />
      </label>}
      <button onClick={async () => {
        if (loading) return
        setLoading(true); setError(null); setApplied(null)
        try { setPreview(await previewAdaptiveReplan(roadmapId, adaptiveStrategy, { targetDailyMinutes: adaptiveStrategy === 'INCREASE_DAILY_TIME' ? targetDailyMinutes : undefined, targetDeadline: adaptiveStrategy === 'EXTEND_DEADLINE' ? targetDeadline : undefined })) }
        catch (e) { setError(e instanceof Error ? e.message : 'Could not generate an adaptive preview.') }
        finally { setLoading(false) }
      }} disabled={loading || (adaptiveStrategy === 'EXTEND_DEADLINE' && !targetDeadline)} className="mt-4 rounded-md bg-flow px-4 py-2 text-sm font-medium text-ink disabled:opacity-50">{loading ? 'Analyzing…' : 'Generate adaptive preview'}</button>
    </div>}

    <div className="mt-6 rounded-xl border border-ink-border bg-ink-panel p-5"><textarea value={request} onChange={e => setRequest(e.target.value)} rows={4} placeholder="e.g. Maths ko 30 hours kam karo aur Python add karo." className="w-full rounded-md border border-ink-border bg-ink-panel px-3 py-2.5 text-paper outline-none focus:border-flow" />{!adaptiveMode && <button onClick={handlePreview} disabled={loading || !request.trim()} className="mt-3 rounded-md bg-flow px-4 py-2 text-sm font-medium text-ink disabled:opacity-50">{loading ? 'Thinking…' : 'Generate Preview'}</button>}</div>

    {error && <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400">{error}</div>}
    {applied && <div className="mt-4 rounded-md border border-flow/40 bg-flow/10 p-3 text-sm text-flow">Applied successfully as roadmap v{applied}. Past execution history was preserved.</div>}

    {preview && <div className="mt-6 rounded-xl border border-ink-border bg-ink-panel p-5"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-flow/40 px-2.5 py-1 text-xs text-flow">{preview.edit_mode} change</span><span className="text-xs text-mute">based on v{preview.base_version}</span></div><p className="mt-4 text-sm text-paper">{preview.explanation}</p>{preview.adaptive && <div className="mt-4 rounded-lg border border-flow/30 bg-flow/5 p-4 text-sm text-paper/90"><p><strong>Actual vs planned:</strong> {Math.round(preview.adaptive.history_actual_seconds / 60)}m actual / {Math.round(preview.adaptive.history_planned_seconds / 60)}m planned across {preview.adaptive.history_days_with_plans} planned days.</p><p className="mt-1"><strong>Sustainable pace:</strong> {preview.adaptive.sustainable_daily_capacity_minutes}m/day. <strong>Remaining:</strong> {preview.adaptive.remaining_hours}h.</p>{preview.adaptive.deadline && <p className="mt-1"><strong>Deadline:</strong> {preview.adaptive.deadline} · required {preview.adaptive.required_daily_minutes ?? '—'}m/day.</p>}</div>}
      <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-black p-4"><h3 className="text-sm font-medium text-paper">Changes</h3><div className="mt-2 flex flex-col gap-2 text-sm text-paper/80">{preview.changes.map((c: { text?: string; type?: string }, i: number)=><div key={i}>• {String(c.text ?? c.type ?? 'change')}</div>)}</div></div><div className="rounded-lg border border-black p-4"><h3 className="text-sm font-medium text-paper">Impact</h3><p className="mt-2 text-sm text-paper/80">Workload: {mins(impact?.old_planned_minutes)} → {mins(impact?.new_planned_minutes)} ({impact && impact.net_minutes >= 0 ? '+' : ''}{mins(Math.abs(impact?.net_minutes ?? 0))})</p><p className="mt-1 text-sm text-paper/80">Daily capacity: {impact?.daily_capacity_minutes}m</p><p className="mt-1 text-sm text-paper/80">Remaining after edit: {mins((impact?.remaining_minutes_after_edit ?? 0) * 60)}</p><p className={`mt-2 text-sm ${impact?.deadline_infeasible ? 'text-red-400' : 'text-flow'}`}>{impact?.deadline_explanation}</p></div></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-3"><div><h4 className="text-xs uppercase tracking-wider text-mute">Removed</h4>{impact?.removed_items.length ? impact.removed_items.map((x: { title: string }, i: number)=><p key={i} className="mt-1 text-sm text-red-300">− {String(x.title)}</p>) : <p className="mt-1 text-sm text-mute">None</p>}</div><div><h4 className="text-xs uppercase tracking-wider text-mute">Added</h4>{impact?.added_items.length ? impact.added_items.map((x: { title: string }, i: number)=><p key={i} className="mt-1 text-sm text-flow">+ {String(x.title)}</p>) : <p className="mt-1 text-sm text-mute">None</p>}</div><div><h4 className="text-xs uppercase tracking-wider text-mute">Dependencies</h4>{impact?.changed_dependencies.length ? impact.changed_dependencies.map((x: { id: string }, i: number)=><p key={i} className="mt-1 text-sm text-paper/80">{String(x.id)}</p>) : <p className="mt-1 text-sm text-mute">No changes</p>}</div></div>
      <div className="mt-6 flex gap-3"><button onClick={() => setPreview(null)} disabled={loading} className="rounded-md border border-ink-border px-4 py-2 text-sm text-paper">Reject</button><button onClick={handleApply} disabled={loading || !preview.can_apply} className="rounded-md bg-flow px-4 py-2 text-sm font-medium text-ink disabled:opacity-50">{preview.can_apply ? 'Apply Changes' : 'Cannot apply yet'}</button></div>
    </div>}

    <div className="mt-8 rounded-xl border border-ink-border bg-ink-panel p-5"><h2 className="font-display text-lg text-paper">Roadmap versions</h2><p className="mt-1 text-xs text-mute">Restore never deletes history; it creates another version through the same validation path.</p><div className="mt-4 flex flex-col gap-2">{versions.slice().reverse().map(v=><div key={v.version_number} className="flex items-center justify-between rounded-lg border border-black px-4 py-3"><div><button onClick={() => setViewVersion(viewVersion === v.version_number ? null : v.version_number)} className="text-sm text-paper hover:text-flow">Version {v.version_number}</button>{viewVersion === v.version_number && <div className="mt-2 text-xs text-mute">{String(v.schema_payload?.title ?? 'Untitled')} · {Array.isArray(v.schema_payload?.tasks) ? v.schema_payload.tasks.length : 0} tasks</div>}</div>{v.version_number !== (versions.length > 0 ? versions[versions.length - 1].version_number : null) && <button onClick={() => handleRestore(v.version_number)} disabled={loading} className="text-xs text-flow hover:underline">Restore as new version</button>}</div>)}</div></div>
  </div></div>
}
