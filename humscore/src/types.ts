export type LivePitch = {
    frequency: number,
    note: string,
    rawNote: string,
    cents: number,
    clarity: number,
    volume: number
}

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

export type CalibrationPoint = {
    id: number,
    selectedNote: string,
    selectedMidi: number,
    detectedFrequency: number,
    offsetCents: number,
}

export type CalibrationChoice = {
    note: string,
    midi: number
}

export type PendingCalibration = {
    detectedFrequency: number,
    detectedNote: string,
    choices: CalibrationChoice[]
}

// displays how calibration failed
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