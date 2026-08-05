import type { CalibrationPoint } from "../types"
import { frequencyToMidiFloat } from "./noteUtils"

export function getCalibrationOffsetForMidi(
  midi: number,
  calibrationPoints: CalibrationPoint[]
) {
  if (calibrationPoints.length === 0) return 0

  const sortedPoints = [...calibrationPoints].sort(
    (a, b) => a.selectedMidi - b.selectedMidi
  )

  if (sortedPoints.length === 1) {
    return sortedPoints[0].offsetCents
  }

  if (midi <= sortedPoints[0].selectedMidi) {
    return sortedPoints[0].offsetCents
  }

  const lastPoint = sortedPoints[sortedPoints.length - 1]

  if (midi >= lastPoint.selectedMidi) {
    return lastPoint.offsetCents
  }

  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const left = sortedPoints[i]
    const right = sortedPoints[i + 1]

    if (midi >= left.selectedMidi && midi <= right.selectedMidi) {
      const progress =
        (midi - left.selectedMidi) / (right.selectedMidi - left.selectedMidi)

      return left.offsetCents + progress * (right.offsetCents - left.offsetCents)
    }
  }

  return 0;
}

export function applyCalibrationToFrequency(
  frequency: number,
  calibrationPoints: CalibrationPoint[]
) {
  const rawMidi = frequencyToMidiFloat(frequency)
  const estimatedOffsetCents = getCalibrationOffsetForMidi(
    rawMidi,
    calibrationPoints
  )

  return frequency / Math.pow(2, estimatedOffsetCents / 1200)
}