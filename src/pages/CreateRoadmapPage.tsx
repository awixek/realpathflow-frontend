import { motion } from 'framer-motion'
import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { AIQuestion, CompiledProposal, compileRoadmapProposal, fetchDiscoveryQuestions } from '../lib/aiApi'
import { publishRoadmap, RoadmapPublishException } from '../lib/roadmapApi'

type Step = 'goal' | 'questions' | 'review'

export default function CreateRoadmapPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('goal')
  const [requirements, setRequirements] = useState('')
  const [questions, setQuestions] = useState<AIQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [proposal, setProposal] = useState<CompiledProposal | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [publishStage, setPublishStage] = useState<string | null>(null)
  const [publishIdempotencyKey, setPublishIdempotencyKey] = useState<string | null>(null)
  const [startMode, setStartMode] = useState<'immediate' | 'tomorrow'>('immediate')
  const [deadline, setDeadline] = useState('')

  async function handleGoalSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const qs = await fetchDiscoveryQuestions(requirements)
      setQuestions(qs)
      setStep('questions')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the AI. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAnswersSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await compileRoadmapProposal(requirements, answers)
      setProposal(result)
      setPublishIdempotencyKey(crypto.randomUUID())
      setPublishStage(null)
      setStep('review')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate a roadmap. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    if (!proposal || loading) return
    const key = publishIdempotencyKey ?? crypto.randomUUID()
    if (!publishIdempotencyKey) setPublishIdempotencyKey(key)
    setLoading(true)
    setError(null)
    setPublishStage('VALIDATING')
    try {
      setPublishStage('SAVING')
      await publishRoadmap(proposal, key, { startMode, deadline })
      // Saving and activation are one atomic server operation. We deliberately
      // do not pretend that the browser can observe an internal DB sub-stage.
      setPublishStage('READY')
      navigate('/')
    } catch (err) {
      setPublishStage(null)
      if (err instanceof RoadmapPublishException) {
        setError(`${err.message}${err.requestId ? ` (Request ${err.requestId})` : ''}`)
      } else {
        setError(err instanceof Error ? err.message : 'Could not save this roadmap. Try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <NavBar />

      <div className="mx-auto max-w-2xl px-6 py-10">
        {step === 'goal' && (
          <motion.form
            key="goal"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleGoalSubmit}
            className="flex flex-col gap-4"
          >
            <h1 className="font-display text-2xl text-paper">What do you want to achieve?</h1>
            <p className="text-sm text-mute">
              Describe it in your own words — a skill, a project, an exam. The AI will ask a few
              follow-up questions before building your roadmap.
            </p>
            <textarea
              required
              minLength={5}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              rows={5}
              placeholder="e.g. I want to learn Python well enough to build small automation scripts"
              className="rounded-md border border-ink-border bg-ink-panel px-3 py-2.5 text-paper outline-none focus:border-flow"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="self-start rounded-md bg-flow px-4 py-2 text-sm font-medium text-ink hover:bg-flow/90 disabled:opacity-60"
            >
              {loading ? 'Thinking…' : 'Continue'}
            </button>
          </motion.form>
        )}

        {step === 'questions' && (
          <motion.form
            key="questions"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleAnswersSubmit}
            className="flex flex-col gap-5"
          >
            <h1 className="font-display text-2xl text-paper">A few quick questions</h1>
            {questions.map((q) => (
              <label key={q.id} className="flex flex-col gap-1.5">
                <span className="text-sm text-paper/90">{q.question}</span>
                <input
                  required
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  className="rounded-md border border-ink-border bg-ink-panel px-3 py-2.5 text-paper outline-none focus:border-flow"
                />
              </label>
            ))}
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="self-start rounded-md bg-flow px-4 py-2 text-sm font-medium text-ink hover:bg-flow/90 disabled:opacity-60"
            >
              {loading ? 'Generating your roadmap…' : 'Generate roadmap'}
            </button>
          </motion.form>
        )}

        {step === 'review' && proposal && (
          <motion.div key="review" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="font-display text-2xl text-paper">{proposal.title}</h1>
            <p className="mt-1 text-sm text-mute">{proposal.description}</p>
            <p className="mt-1 text-xs text-mute">{proposal.total_planned_hours} hours planned total</p>

            {proposal.metadata?.research && proposal.metadata.research.status !== 'not_needed' && (
              <div className="mt-4 rounded-lg border border-ink-border bg-ink-panel p-4">
                <h2 className="text-sm font-medium text-paper">Web research</h2>
                <p className="mt-1 text-xs text-mute">
                  {proposal.metadata.research.status === 'success'
                    ? `Used ${proposal.metadata.research.sources.length} research source${proposal.metadata.research.sources.length === 1 ? '' : 's'}.`
                    : proposal.metadata.research.reason ?? 'Research was unavailable.'}
                </p>
                {proposal.metadata.research.sources.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    {proposal.metadata.research.sources.slice(0, 5).map((source) => (
                      <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="truncate text-xs text-flow hover:underline">
                        {source.authoritative ? '✓ ' : ''}{source.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-4">
              {proposal.tasks.map((task) => (
                <div key={task.order_index} className="rounded-lg border border-black p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-paper">{task.title}</h3>
                    <span className="text-xs text-mute">{task.planned_hours}h</span>
                  </div>
                  <ul className="mt-2 flex flex-col gap-1">
                    {task.subtasks.map((sub) => (
                      <li key={sub.order_index} className="text-sm text-paper/80">
                        · {sub.title} <span className="text-mute">({sub.planned_minutes}m)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-lg border border-ink-border bg-ink-panel p-4">
              <h2 className="text-sm font-medium text-paper">Execution start</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs text-mute">
                  Start
                  <select value={startMode} onChange={(e) => setStartMode(e.target.value as 'immediate' | 'tomorrow')} className="rounded-md border border-ink-border bg-ink-panel px-3 py-2 text-sm text-paper">
                    <option value="immediate">Start today</option>
                    <option value="tomorrow">Start tomorrow</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-mute">
                  Deadline (optional)
                  <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="rounded-md border border-ink-border bg-ink-panel px-3 py-2 text-sm text-paper" />
                </label>
              </div>
            </div>

            {publishStage && (
              <div className="mt-4 rounded-md border border-ink-border bg-ink-panel p-3 text-sm text-paper">
                {publishStage === 'VALIDATING' && 'Validating roadmap…'}
                {publishStage === 'SAVING' && 'Saving roadmap…'}
                                {publishStage === 'READY' && 'Roadmap ready'}
              </div>
            )}
            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => { setStep('goal'); setProposal(null); setPublishIdempotencyKey(null); setPublishStage(null); setError(null) }}
                className="rounded-md border border-ink-border px-4 py-2 text-sm text-paper hover:border-flow"
              >
                Start over
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="rounded-md bg-flow px-4 py-2 text-sm font-medium text-ink hover:bg-flow/90 disabled:opacity-60"
              >
                {loading ? (publishStage === 'VALIDATING' ? 'Validating…' : publishStage === 'SAVING' ? 'Saving & activating…' : 'Save & start') : 'Save & start'}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
