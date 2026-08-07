import { describe, expect, it } from "vitest"
import type { NoteBlock } from "../types"
import {
  quantizeNoteBlock,
  quantizeNoteBlocks,
  quantizeTimeToGrid,
} from "./quantize"

function block(
  start: number,
  end: number,
  note = "C4",
  midi = 60
): NoteBlock {
  return {
    id: Math.random(),
    note,
    midi,
    start,
    end,
    duration: end - start,
    confidence: "strong",
    averageClarity: 0.9,
    averageVolume: 0.03,
  }
}

describe("quantize", () => {
  it("snaps time to the nearest grid line", () => {
    expect(quantizeTimeToGrid(0.12, 0.25)).toBeCloseTo(0)
    expect(quantizeTimeToGrid(0.13, 0.25)).toBeCloseTo(0.25)
    expect(quantizeTimeToGrid(0.38, 0.25)).toBeCloseTo(0.5)
  })

  it("does not return negative snapped time", () => {
    expect(quantizeTimeToGrid(-0.2, 0.25)).toBe(0)
  })

  it("returns 0 for invalid time", () => {
    expect(quantizeTimeToGrid(Number.NaN, 0.25)).toBe(0)
  })

  it("keeps original time if grid step is invalid", () => {
    expect(quantizeTimeToGrid(0.4, 0)).toBe(0.4)
  })

  it("quantizes one note block to the grid", () => {
    const result = quantizeNoteBlock(block(0.11, 0.64), {
      tempoBpm: 120,
      stepsPerBeat: 2,
    })

    expect(result.start).toBeCloseTo(0)
    expect(result.end).toBeCloseTo(0.75)
    expect(result.duration).toBeCloseTo(0.75)
  })

  it("keeps very short notes at least one grid step long", () => {
    const result = quantizeNoteBlock(block(0.11, 0.12), {
      tempoBpm: 120,
      stepsPerBeat: 2,
    })

    expect(result.duration).toBeCloseTo(0.25)
  })

  it("does not mutate the original note block", () => {
    const original = block(0.11, 0.64)

    quantizeNoteBlock(original, {
      tempoBpm: 120,
      stepsPerBeat: 2,
    })

    expect(original.start).toBe(0.11)
    expect(original.end).toBe(0.64)
  })

  it("sorts quantized blocks by start time and pitch", () => {
    const result = quantizeNoteBlocks(
      [block(1, 1.5, "E4", 64), block(0, 0.5, "C4", 60)],
      {
        tempoBpm: 120,
        stepsPerBeat: 2,
      }
    )

    expect(result[0].note).toBe("C4")
    expect(result[1].note).toBe("E4")
  })
})