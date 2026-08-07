import { describe, expect, it } from "vitest"
import {
  getBeatMarkers,
  getSecondsPerBeat,
  normalizeBeatsPerBar,
  normalizeTempoBpm,
} from "./rhythm"

describe("rhythm", () => {
  it("normalizes tempo inside the allowed range", () => {
    expect(normalizeTempoBpm(120)).toBe(120)
    expect(normalizeTempoBpm(10)).toBe(40)
    expect(normalizeTempoBpm(999)).toBe(240)
  })

  it("uses default tempo for invalid tempo values", () => {
    expect(normalizeTempoBpm(Number.NaN)).toBe(120)
  })

  it("normalizes beats per bar inside the allowed range", () => {
    expect(normalizeBeatsPerBar(4)).toBe(4)
    expect(normalizeBeatsPerBar(0)).toBe(1)
    expect(normalizeBeatsPerBar(99)).toBe(12)
  })

  it("uses default beats per bar for invalid values", () => {
    expect(normalizeBeatsPerBar(Number.NaN)).toBe(4)
  })

  it("converts 120 BPM to 0.5 seconds per beat", () => {
    expect(getSecondsPerBeat(120)).toBeCloseTo(0.5)
  })

  it("converts 60 BPM to 1 second per beat", () => {
    expect(getSecondsPerBeat(60)).toBeCloseTo(1)
  })

  it("creates beat markers across the timeline", () => {
    const markers = getBeatMarkers(2, 120, 4)

    expect(markers.map((marker) => marker.time)).toEqual([0, 0.5, 1, 1.5, 2])
  })

  it("marks the first beat of each bar", () => {
    const markers = getBeatMarkers(2, 120, 4)

    expect(markers[0].isBarStart).toBe(true)
    expect(markers[1].isBarStart).toBe(false)
    expect(markers[4].isBarStart).toBe(true)
    expect(markers[4].barNumber).toBe(2)
  })

  it("creates at least the first marker for a zero-duration timeline", () => {
    const markers = getBeatMarkers(0, 120, 4)

    expect(markers).toHaveLength(1)
    expect(markers[0].time).toBe(0)
    expect(markers[0].isBarStart).toBe(true)
  })
})