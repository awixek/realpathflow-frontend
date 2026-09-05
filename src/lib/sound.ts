let ctx: AudioContext | null = null

function getContext() {
  if (!ctx) {
    ctx = new AudioContext()
  }
  return ctx
}

/** Two-note ascending chime, played when a subtask is completed. */
export function playSubtaskChime() {
  const audioCtx = getContext()
  const now = audioCtx.currentTime
  const notes = [523.25, 783.99] // C5, G5

  notes.forEach((freq, i) => {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq

    const start = now + i * 0.12
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.2, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35)

    osc.connect(gain).connect(audioCtx.destination)
    osc.start(start)
    osc.stop(start + 0.4)
  })
}
