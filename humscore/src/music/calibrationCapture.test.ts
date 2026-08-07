import { describe, expect, it } from "vitest"
import {
  createEmptyCalibrationDebug,
  evaluateCalibrationSample,
  updateCalibrationDebug,
  type CalibrationCaptureConfig,
} from "./calibrationCapture"

const config: CalibrationCaptureConfig = {
  minFrequency: 50,
  maxFrequency: 1000,
  minClarity: 0.3,
  minVolume: 0.0025,
}

describe("calibrationCapture", () => {
  it("accepts a usable calibration sample", () => {
    const decision = evaluateCalibrationSample(
      {
        pitch: 440,
        clarity: 0.8,
        volume: 0.02,
      },
      config
    )

    expect(decision.accepted).toBe(true)
  })

  it("rejects a pitch below the frequency range", () => {
    const decision = evaluateCalibrationSample(
      {
        pitch: 20,
        clarity: 0.8,
        volume: 0.02,
      },
      config
    )

    expect(decision).toEqual({
      accepted: false,
      reason: "outOfRange",
    })
  })

  it("rejects a pitch above the frequency range", () => {
    const decision = evaluateCalibrationSample(
      {
        pitch: 2000,
        clarity: 0.8,
        volume: 0.02,
      },
      config
    )

    expect(decision).toEqual({
      accepted: false,
      reason: "outOfRange",
    })
  })

  it("rejects NaN pitch as out of range", () => {
    const decision = evaluateCalibrationSample(
      {
        pitch: Number.NaN,
        clarity: 0.8,
        volume: 0.02,
      },
      config
    )

    expect(decision).toEqual({
      accepted: false,
      reason: "outOfRange",
    })
  })

  it("rejects low clarity", () => {
    const decision = evaluateCalibrationSample(
      {
        pitch: 440,
        clarity: 0.1,
        volume: 0.02,
      },
      config
    )

    expect(decision).toEqual({
      accepted: false,
      reason: "lowClarity",
    })
  })

  it("rejects low volume", () => {
    const decision = evaluateCalibrationSample(
      {
        pitch: 440,
        clarity: 0.8,
        volume: 0.001,
      },
      config
    )

    expect(decision).toEqual({
      accepted: false,
      reason: "lowVolume",
    })
  })

  it("creates empty debug counters", () => {
    expect(createEmptyCalibrationDebug()).toEqual({
      framesSeen: 0,
      acceptedSamples: 0,
      rejectedLowClarity: 0,
      rejectedLowVolume: 0,
      rejectedOutOfRange: 0,
      lastPitch: null,
      lastClarity: null,
      lastVolume: null,
    })
  })

  it("updates debug counters for accepted samples", () => {
    const debug = createEmptyCalibrationDebug()

    const updated = updateCalibrationDebug(
      debug,
      {
        pitch: 440,
        clarity: 0.8,
        volume: 0.02,
      },
      {
        accepted: true,
      }
    )

    expect(updated.framesSeen).toBe(1)
    expect(updated.acceptedSamples).toBe(1)
    expect(updated.lastPitch).toBe(440)
    expect(updated.lastClarity).toBe(0.8)
    expect(updated.lastVolume).toBe(0.02)
  })

  it("updates debug counters for rejected samples", () => {
    const debug = createEmptyCalibrationDebug()

    const updated = updateCalibrationDebug(
      debug,
      {
        pitch: 20,
        clarity: 0.8,
        volume: 0.02,
      },
      {
        accepted: false,
        reason: "outOfRange",
      }
    )

    expect(updated.framesSeen).toBe(1)
    expect(updated.acceptedSamples).toBe(0)
    expect(updated.rejectedOutOfRange).toBe(1)
  })
})