export const DEFAULT_TEMPO_BPM = 120
export const MIN_TEMPO_BPM = 40
export const MAX_TEMPO_BPM = 240

export const DEFAULT_BEATS_PER_BAR = 4
export const MIN_BEATS_PER_BAR = 1
export const MAX_BEATS_PER_BAR = 12

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

/**
 * Keeps the top number of the time signature inside a practical range
 * (For now, this controls visual bar grouping only)
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
 * Creates vertical grid markers for beats and bar starts
 * (These markers are visual only REMEMEBER TODO: note quantization)
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