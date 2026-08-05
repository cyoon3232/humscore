import { describe, expect, it } from "vitest"
import type { CalibrationPoint } from "../types"
import {
  applyCalibrationToFrequency,
  getCalibrationOffsetForMidi,
} from "./calibration"

describe("calibration", () => {
  it("returns 0 offset when there are no calibration points", () => {
    expect(getCalibrationOffsetForMidi(69, [])).toBe(0)
  })

  it("uses the only calibration point when one point exists", () => {
    const points: CalibrationPoint[] = [
      {
        id: 1,
        selectedNote: "A4",
        selectedMidi: 69,
        detectedFrequency: 430,
        offsetCents: -40,
      },
    ]

    expect(getCalibrationOffsetForMidi(60, points)).toBe(-40)
    expect(getCalibrationOffsetForMidi(69, points)).toBe(-40)
    expect(getCalibrationOffsetForMidi(80, points)).toBe(-40)
  })

  it("interpolates between two calibration points", () => {
    const points: CalibrationPoint[] = [
      {
        id: 1,
        selectedNote: "C4",
        selectedMidi: 60,
        detectedFrequency: 260,
        offsetCents: -20,
      },
      {
        id: 2,
        selectedNote: "C5",
        selectedMidi: 72,
        detectedFrequency: 530,
        offsetCents: 20,
      },
    ]

    expect(getCalibrationOffsetForMidi(66, points)).toBeCloseTo(0)
  })

  it("corrects a flat detected frequency upward", () => {
    const points: CalibrationPoint[] = [
      {
        id: 1,
        selectedNote: "A4",
        selectedMidi: 69,
        detectedFrequency: 430,
        offsetCents: -40,
      },
    ]

    const corrected = applyCalibrationToFrequency(430, points)

    expect(corrected).toBeGreaterThan(430)
  })
})