import { describe, expect, it } from "vitest"
import {
  frequencyToNoteInfo,
  getMedian,
  midiToFrequency,
  midiToNote,
} from "./noteUtils"

describe("noteUtils", () => {
  it("converts MIDI 69 to A4", () => {
    expect(midiToNote(69)).toBe("A4")
  })

  it("converts MIDI 60 to C4", () => {
    expect(midiToNote(60)).toBe("C4")
  })

  it("converts A4 MIDI 69 to 440 Hz", () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 5)
  })

  it("converts 440 Hz to A4 with 0 cents", () => {
    const result = frequencyToNoteInfo(440)

    expect(result.note).toBe("A4")
    expect(result.midi).toBe(69)
    expect(result.cents).toBe(0)
  })

  it("gets the median of an odd-length list", () => {
    expect(getMedian([5, 1, 9])).toBe(5)
  })

  it("gets the median of an even-length list", () => {
    expect(getMedian([10, 2, 4, 8])).toBe(6)
  })
})