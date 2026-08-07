export const DEFAULT_TEMPO_BPM = 120
export const MIN_TEMPO_BPM = 40
export const MAX_TEMPO_BPM = 240

export const DEFAULT_BEATS_PER_BAR = 4
export const MIN_BEATS_PER_BAR = 1
export const MAX_BEATS_PER_BAR = 12

export const DEFAULT_STEPS_PER_BEAT = 2
export const MIN_STEPS_PER_BEAT = 1
export const MAX_STEPS_PER_BEAT = 8

export type BeatMarker = {
  time: number
  beatIndex: number
  beatInBar: number
  barNumber: number
  isBarStart: boolean
}

/**
 * Keeps tempo values inside a practical range for editing and playback
 */
export function normalizeTempoBpm(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_TEMPO_BPM

  return Math.min(Math.max(Math.round(value), MIN_TEMPO_BPM), MAX_TEMPO_BPM)
}

export function normalizeStepsPerBeat(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_STEPS_PER_BEAT

  return Math.min(
    Math.max(Math.round(value), MIN_STEPS_PER_BEAT),
    MAX_STEPS_PER_BEAT
  )
}

/**
 * Keeps the top number of the time signature inside a practical range
 */
export function normalizeBeatsPerBar(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_BEATS_PER_BAR

  return Math.min(
    Math.max(Math.round(value), MIN_BEATS_PER_BAR),
    MAX_BEATS_PER_BAR
  )
}

/**
 * Converts tempo into seconds per beat
 * Example: 120 BPM means each beat is 0.5 seconds
 */
export function getSecondsPerBeat(tempoBpm: number) {
  return 60 / normalizeTempoBpm(tempoBpm)
}

/**
 * Converts tempo and subdivision into one editable grid step.
 * Example: 120 BPM and 2 steps per beat means each grid step is 0.25 seconds.
 */
export function getSecondsPerGridStep(tempoBpm: number, stepsPerBeat: number) {
  return getSecondsPerBeat(tempoBpm) / normalizeStepsPerBeat(stepsPerBeat)
}

/**
 * Creates vertical grid markers for beats and bar starts
 */
export function getBeatMarkers(
  durationSeconds: number,
  tempoBpm: number,
  beatsPerBar: number
) {
  const safeDuration = Number.isFinite(durationSeconds)
    ? Math.max(durationSeconds, 0)
    : 0

  const safeBeatsPerBar = normalizeBeatsPerBar(beatsPerBar)
  const secondsPerBeat = getSecondsPerBeat(tempoBpm)

  const lastBeatIndex = Math.floor((safeDuration + 1e-9) / secondsPerBeat)
  const markers: BeatMarker[] = []

  for (let beatIndex = 0; beatIndex <= lastBeatIndex; beatIndex++) {
    const beatInBar = (beatIndex % safeBeatsPerBar) + 1

    markers.push({
      time: beatIndex * secondsPerBeat,
      beatIndex,
      beatInBar,
      barNumber: Math.floor(beatIndex / safeBeatsPerBar) + 1,
      isBarStart: beatInBar === 1,
    })
  }

  return markers
}