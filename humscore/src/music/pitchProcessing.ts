import type { NoteBlock, PitchFrame } from "../types"

const GOOD_CLARITY = 0.75
const GOOD_VOLUME = 0.012

const MIN_UNCERTAIN_DURATION = 0.05
const MIN_STRONG_DURATION = 0.18
const MAX_GAP_BETWEEN_FRAMES = 0.14

export function processPitchFrames(frames: PitchFrame[]) {
  const blocks: NoteBlock[] = []

  if (frames.length === 0) return blocks

  let currentGroup: PitchFrame[] = [frames[0]]

  function finishGroup(group: PitchFrame[]) {
    if (group.length === 0) return

    const first = group[0]
    const last = group[group.length - 1]

    const start = first.time
    const rawDuration = Math.max(last.time - first.time, 0)

    // Ignores a single pitch frame
    if (group.length === 1 && rawDuration < MIN_UNCERTAIN_DURATION) return

    const duration = Math.max(last.time - first.time, 0.05)
    const end = start + duration

    const averageClarity =
      group.reduce((sum, frame) => sum + frame.clarity, 0) / group.length

    const averageVolume =
      group.reduce((sum, frame) => sum + frame.volume, 0) / group.length
      
    const confidence =
      duration >= MIN_STRONG_DURATION &&
      averageClarity >= GOOD_CLARITY &&
      averageVolume >= GOOD_VOLUME
        ? "strong"
        : "uncertain"

    blocks.push({
      id: Date.now() + Math.random(),
      note: first.correctedNote,
      midi: first.correctedMidi,
      start,
      end,
      duration,
      confidence,
      averageClarity,
      averageVolume
    })
  }

  for (let i = 1; i < frames.length; i++) {
    const previousFrame = frames[i - 1]
    const currentFrame = frames[i]

    const sameNote = currentFrame.correctedNote === previousFrame.correctedNote
    const smallGap =
      currentFrame.time - previousFrame.time <= MAX_GAP_BETWEEN_FRAMES

    if (sameNote && smallGap) {
      currentGroup.push(currentFrame)
    } else {
      finishGroup(currentGroup)
      currentGroup = [currentFrame]
    }
  }

  finishGroup(currentGroup)

  return blocks;
}