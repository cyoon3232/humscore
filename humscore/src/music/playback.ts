import { midiToFrequency } from "./noteUtils"

/**
 * Playback helpers for generated note audio.
 */

/** Schedules a generated tone using the Web Audio API. */
export function scheduleGeneratedNote(
    context: AudioContext,
    midi: number,
    startTime: number,
    duration: number,
    volume: number
  ) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = "triangle"
    oscillator.frequency.setValueAtTime(midiToFrequency(midi), startTime)

    gain.gain.setValueAtTime(0, startTime)
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.01)
    gain.gain.setValueAtTime(volume, startTime + Math.max(duration - 0.03, 0.02))
    gain.gain.linearRampToValueAtTime(0, startTime + duration)

    oscillator.connect(gain)
    gain.connect(context.destination)

    oscillator.start(startTime)
    oscillator.stop(startTime + duration + 0.05)
  }