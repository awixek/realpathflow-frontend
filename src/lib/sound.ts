let ctx: AudioContext | null = null

function getContext() {
  if (!ctx) {
    ctx = new AudioContext()
  }
  return ctx
}

/** Unlock the audio context from the Start button's user gesture. */
export async function prepareCompletionSound() {
  try {
    const audioCtx = getContext()
    if (audioCtx.state === 'suspended') await audioCtx.resume()
  } catch {
    // Sound is an enhancement; notification delivery and timer state must not fail.
  }
}

/** A short ascending four-note melody played when a daily task target is reached. */
export function playSubtaskChime() {
  try {
    const audioCtx = getContext()
    const play = () => {
      const now = audioCtx.currentTime
      const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator()
        const gain = audioCtx.createGain()
        osc.type = 'sine'
        osc.frequency.value = freq
        const start = now + i * 0.14
        gain.gain.setValueAtTime(0, start)
        gain.gain.linearRampToValueAtTime(0.16, start + 0.025)
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.30)
        osc.connect(gain).connect(audioCtx.destination)
        osc.start(start)
        osc.stop(start + 0.32)
      })
    }

    if (audioCtx.state === 'suspended') {
      void audioCtx.resume().then(play).catch(() => {})
      return
    }
    if (audioCtx.state === 'running') play()
  } catch {
    // Browsers may block audio after the page is backgrounded; don't break timer state.
  }
}
