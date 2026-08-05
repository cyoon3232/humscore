import { describe, expect, it } from "vitest"
import type { PitchFrame } from "../types"
import { processPitchFrames } from "./pitchProcessing"

function frame(
  time: number,
  correctedNote: string,
  correctedMidi: number,
  clarity = 0.9,
  volume = 0.03
): PitchFrame {
  return {
    time,
    frequency: 440,
    rawNote: correctedNote,
    correctedNote,
    correctedMidi,
    cents: 0,
    clarity,
    volume,
  }
}

describe("pitchProcessing", () => {
  it("returns no blocks when there are no frames", () => {
    expect(processPitchFrames([])).toEqual([])
  })

  it("groups consecutive frames with the same note", () => {
    const blocks = processPitchFrames([
      frame(0, "C4", 60),
      frame(0.08, "C4", 60),
      frame(0.16, "C4", 60),
      frame(0.24, "D4", 62),
      frame(0.32, "D4", 62),
      frame(0.40, "D4", 62),
    ])

    expect(blocks).toHaveLength(2)
    expect(blocks[0].note).toBe("C4")
    expect(blocks[1].note).toBe("D4")
  })

  it("marks long clear notes as strong", () => {
    const blocks = processPitchFrames([
      frame(0, "C4", 60),
      frame(0.1, "C4", 60),
      frame(0.22, "C4", 60),
    ])

    expect(blocks[0].confidence).toBe("strong")
  })

  it("marks short notes as uncertain", () => {
    const blocks = processPitchFrames([
      frame(0, "C4", 60),
      frame(0.06, "C4", 60),
    ])

    expect(blocks[0].confidence).toBe("uncertain")
  })
})