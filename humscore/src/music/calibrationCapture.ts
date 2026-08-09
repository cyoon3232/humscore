import type { CalibrationDebug } from "../types"

/**
 * Helpers for accepting, rejecting, and debugging calibration samples.
 */

export type CalibrationSample = {
  pitch: number,
  clarity: number,
  volume: number
}

export type CalibrationCaptureConfig = {
  minFrequency: number,
  maxFrequency: number,
  minClarity: number,
  minVolume: number
}

export type CalibrationSampleDecision =
  | { accepted: true }
  | {
    accepted: false
    reason: "outOfRange" | "lowClarity" | "lowVolume"
    }

/** Creates a blank debug object for one calibration attempt. */
export function createEmptyCalibrationDebug(): CalibrationDebug {
  return {
    framesSeen: 0,
    acceptedSamples: 0,
    rejectedLowClarity: 0,
    rejectedLowVolume: 0,
    rejectedOutOfRange: 0,
    lastPitch: null,
    lastClarity: null,
    lastVolume: null,
  }
} 

/** Decides whether a pitch sample is usable for calibration. */
export function evaluateCalibrationSample(
  sample: CalibrationSample,
  config: CalibrationCaptureConfig
): CalibrationSampleDecision {
  const pitchInRange =
    Number.isFinite(sample.pitch) &&
    sample.pitch >= config.minFrequency &&
    sample.pitch <= config.maxFrequency

  if (!pitchInRange) {
    return {
    accepted: false,
    reason: "outOfRange",
    }
  }

  if (sample.clarity < config.minClarity) {
    return {
    accepted: false,
    reason: "lowClarity",
    }
  }

  if (sample.volume < config.minVolume) {
    return {
    accepted: false,
    reason: "lowVolume",
    }
  }

  return {
    accepted: true,
  }
}

/** Returns updated calibration debug counters for one sample decision. */
export function updateCalibrationDebug(
  previousDebug: CalibrationDebug,
  sample: CalibrationSample,
  decision: CalibrationSampleDecision
): CalibrationDebug {
  const nextDebug: CalibrationDebug = {
    ...previousDebug,
    framesSeen: previousDebug.framesSeen + 1,
    lastPitch: Number.isFinite(sample.pitch) ? sample.pitch : null,
    lastClarity: sample.clarity,
    lastVolume: sample.volume,
  }

  if (decision.accepted) {
    return {
    ...nextDebug,
    acceptedSamples: nextDebug.acceptedSamples + 1,
    }
  }

  if (decision.reason === "outOfRange") {
    return {
    ...nextDebug,
    rejectedOutOfRange: nextDebug.rejectedOutOfRange + 1,
    }
  }

  if (decision.reason === "lowClarity") {
    return {
    ...nextDebug,
    rejectedLowClarity: nextDebug.rejectedLowClarity + 1,
    }
  }

  return {
    ...nextDebug,
    rejectedLowVolume: nextDebug.rejectedLowVolume + 1,
  }
}