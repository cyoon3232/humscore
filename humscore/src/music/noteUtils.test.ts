import { describe, expect, it } from "vitest"
import {
  frequencyToMidiFloat,
  frequencyToNoteInfo,
  getMedian,
  midiToFrequency,
  midiToNote,
} from "./noteUtils"

describe("noteUtils", () => {
  it("converts 440 Hz to MIDI 69", () => {
    expect(frequencyToMidiFloat(440)).toBe(69)
  })

  it("converts MIDI 69 to A4", () => {
    expect(midiToNote(69)).toBe("A4")
  })

  it("converts MIDI 60 to C4", () => {
    expect(midiToNote(60)).toBe("C4")
  })

  it("converts MIDI 61 to C#/Db4", () => {
    expect(midiToNote(61)).toBe("C#/Db4")
  })

  it("converts A4 MIDI 69 to 440 Hz", () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 5)
  })

  it("converts MIDI 81 to 880 Hz", () => {
    expect(midiToFrequency(81)).toBeCloseTo(880, 5)
  })

  it("converts 440 Hz to A4 with 0 cents", () => {
    const result = frequencyToNoteInfo(440)

    expect(result.note).toBe("A4")
    expect(result.midi).toBe(69)
    expect(result.cents).toBe(0)
  })

  it("converts 880 Hz to A5 with 0 cents", () => {
    const result = frequencyToNoteInfo(880)

    expect(result.note).toBe("A5")
    expect(result.midi).toBe(81)
    expect(result.cents).toBe(0)
  })

  it("gets the median of an empty list as 0", () => {
    expect(getMedian([])).toBe(0)
  })

  it("gets the median of an odd-length unsorted list", () => {
    expect(getMedian([5, 1, 9])).toBe(5)
  })

  it("gets the median of an even-length unsorted list", () => {
    expect(getMedian([10, 2, 4, 8])).toBe(6)
  })

  it("gets the median with negative numbers", () => {
    expect(getMedian([-10, -2, -4])).toBe(-4)
  })
})