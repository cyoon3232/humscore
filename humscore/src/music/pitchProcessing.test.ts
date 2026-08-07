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

  it("ignores a single-frame noise blip", () => {
    const blocks = processPitchFrames([frame(0, "C4", 60)])

    expect(blocks).toHaveLength(0)
  })

  it("keeps a very short repeated flicker as uncertain", () => {
    const blocks = processPitchFrames([
      frame(0, "C4", 60),
      frame(0.03, "C4", 60),
    ])

    expect(blocks).toHaveLength(1)
    expect(blocks[0].note).toBe("C4")
    expect(blocks[0].confidence).toBe("uncertain")
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

  it("splits the same note when there is a large time gap", () => {
    const blocks = processPitchFrames([
      frame(0, "C4", 60),
      frame(0.1, "C4", 60),
      frame(0.5, "C4", 60),
      frame(0.6, "C4", 60),
    ])

    expect(blocks).toHaveLength(2)
    expect(blocks[0].note).toBe("C4")
    expect(blocks[1].note).toBe("C4")
  })

  it("marks long clear notes as strong", () => {
    const blocks = processPitchFrames([
      frame(0, "C4", 60),
      frame(0.1, "C4", 60),
      frame(0.22, "C4", 60),
    ])

    expect(blocks[0].confidence).toBe("strong")
  })

  it("marks long low-clarity notes as uncertain", () => {
    const blocks = processPitchFrames([
      frame(0, "C4", 60, 0.4, 0.03),
      frame(0.1, "C4", 60, 0.4, 0.03),
      frame(0.22, "C4", 60, 0.4, 0.03),
    ])

    expect(blocks).toHaveLength(1)
    expect(blocks[0].confidence).toBe("uncertain")
  })

  it("marks long low-volume notes as uncertain", () => {
    const blocks = processPitchFrames([
      frame(0, "C4", 60, 0.9, 0.001),
      frame(0.1, "C4", 60, 0.9, 0.001),
      frame(0.22, "C4", 60, 0.9, 0.001),
    ])

    expect(blocks).toHaveLength(1)
    expect(blocks[0].confidence).toBe("uncertain")
  })

  it("stores average clarity and volume", () => {
    const blocks = processPitchFrames([
      frame(0, "C4", 60, 0.8, 0.02),
      frame(0.1, "C4", 60, 1.0, 0.04),
      frame(0.22, "C4", 60, 0.9, 0.03),
    ])

    expect(blocks[0].averageClarity).toBeCloseTo(0.9)
    expect(blocks[0].averageVolume).toBeCloseTo(0.03)
  })
})