export const NOTE_NAMES = [
  "C",
  "C#/Db",
  "D",
  "D#/Eb",
  "E",
  "F",
  "F#/Gb",
  "G",
  "G#/Ab",
  "A",
  "A#/Bb",
  "B"
]

// frequency 440 Hz returns { note: "A4", cents: 0}
/**
 * Every octave doubles the frequency
 * A3 = 220 Hz
 * A4 = 440 Hz
 * A5 = 80 Hz
 * -> Need log_2
 * 
 * MIDI Note
 * A4 = MIDI note 69
 * A5 = MIDI note 81
 * * Each semitone is one MIDI note
 * * 12 MIDI notes = 1 Octave
 * -> from A4: Math.round(69 + 12 * Math.log2(frequency / 440))
 * 
 * Note Name
 * NOTE_NAMES[ ((midiNumber % 12) + 12) % 12 ]
 * 69 % 12 = 9
 * Index 9 of NOTE_NAMES array: "A"
 * (() + 12) % 12 is in case of negative remainder and out of bounds error
 * 
 * Octave
 * Since MIDI number rises by 12 each octave,
 * Divide that MIDI number by 12 and always get its "floor"
 * ie. 5.75 -> 5
 * Octave in human terms is 1 lower than that
 * -> Math.floor(midiNumber / 12) - 1
 * 
 */
export function midiToFrequency(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export function frequencyToMidiFloat(frequency: number) {
  return 69 + 12 * Math.log2(frequency / 440)
}

export function midiToNote(midi: number) {
  const noteName = NOTE_NAMES[((midi % 12) + 12) % 12]
  const octave = Math.floor(midi / 12) - 1
  return `${noteName}${octave}`
}

export function frequencyToNoteInfo(frequency: number) {
  const midiFloat = frequencyToMidiFloat(frequency)
  const midi = Math.round(midiFloat)
  const note = midiToNote(midi)
  const exactFrequency = midiToFrequency(midi)
  const cents = Math.round(1200 * Math.log2(frequency / exactFrequency))

  return {
    note,
    midi,
    cents,
  }
}

export function getRms(input: Float32Array) {
  let sum = 0

  for (const sample of input) {
    sum += sample * sample
  }

  return Math.sqrt(sum / input.length)
}

export function getMedian(numbers: number[]) {
  if (numbers.length === 0) return 0;

  const sorted = [...numbers].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  }

  return sorted[middle]
}