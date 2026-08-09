/**
 * Shared domain types for pitchdetection, calibration, and note editing.
 */


// Current pitch estimate shown in the live microphone display.
export type LivePitch = {
    frequency: number,
    note: string,
    rawNote: string,
    cents: number,
    clarity: number,
    volume: number
}

// One timestamped pitch sample collected while recording.
export type PitchFrame = {
    time: number,
    frequency: number,
    rawNote: string,
    correctedNote: string,
    correctedMidi: number,
    cents: number,
    clarity: number,
    volume: number
}

// A grouped note segment shown in the piano-roll editor.
export type NoteBlock = {
    id: number,
    note: string,
    midi: number,
    start: number,
    end: number,
    duration: number,
    confidence: "strong" | "uncertain",
    averageClarity: number,
    averageVolume: number
}

// User-confirmed pitch offset used to improve note detection.
export type CalibrationPoint = {
    id: number,
    selectedNote: string,
    selectedMidi: number,
    detectedFrequency: number,
    offsetCents: number,
}

// One note option shown after a calibration capture.
export type CalibrationChoice = {
    note: string,
    midi: number
}

// Pending calibration result waiting for user confirmation.
export type PendingCalibration = {
    detectedFrequency: number,
    detectedNote: string,
    choices: CalibrationChoice[]
}

// Counters used to explain why calibration samples were accepted or rejected.
export type CalibrationDebug = {
    framesSeen: number,
    acceptedSamples: number,
    rejectedLowClarity: number,
    rejectedLowVolume: number,
    rejectedOutOfRange: number,
    lastPitch: number | null,
    lastClarity: number | null,
    lastVolume: number | null
}