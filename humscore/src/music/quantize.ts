import type { NoteBlock } from "../types"
import { getSecondsPerGridStep } from "./rhythm"

export type QuantizeConfig = {
  tempoBpm: number
  stepsPerBeat: number
}

/**
 * Snaps a time value to the nearest grid line
 */
export function quantizeTimeToGrid(timeSeconds: number, gridStepSeconds: number) {
  if (!Number.isFinite(timeSeconds)) return 0
  if (!Number.isFinite(gridStepSeconds) || gridStepSeconds <= 0) return timeSeconds

  return Math.max(0, Math.round(timeSeconds / gridStepSeconds) * gridStepSeconds)
}

/**
 * Returns a snapped copy of one note block
 * The original detected block is not mutated
 */
export function quantizeNoteBlock(block: NoteBlock, config: QuantizeConfig) {
  const gridStepSeconds = getSecondsPerGridStep(
    config.tempoBpm,
    config.stepsPerBeat
  )

  const quantizedStart = quantizeTimeToGrid(block.start, gridStepSeconds)
  const quantizedRawEnd = quantizeTimeToGrid(block.end, gridStepSeconds)

  const quantizedEnd =
    quantizedRawEnd <= quantizedStart
      ? quantizedStart + gridStepSeconds
      : quantizedRawEnd

  return {
    ...block,
    start: quantizedStart,
    end: quantizedEnd,
    duration: quantizedEnd - quantizedStart,
  }
}

/**
 * Quantizes all note blocks and keeps them sorted by time
 */
export function quantizeNoteBlocks(
  blocks: NoteBlock[],
  config: QuantizeConfig
) {
  return blocks
    .map((block) => quantizeNoteBlock(block, config))
    .sort((a, b) => a.start - b.start || a.midi - b.midi)
}