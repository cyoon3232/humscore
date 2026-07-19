import { useRef, useState } from 'react'
import { PitchDetector } from 'pitchy'
import './App.css'

type DetectedPitch = {
  frequency: number,
  note: string,
  cents: number,
  clarity: number
}

type NoteBlock = {
  id: number,
  note: string,
  startTime: number,
  endTime: number,
  duration: number
}

type CandidateNote = {
  note: string,
  firstSeenAt: number
}

type CurrentRecordedNote = {
  note: string,
  startTime: number
}

const NOTE_NAMES = [
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

const MIN_CLARITY = 0.5
const MIN_FREQUENCY = 50
const MAX_FREQUENCY = 1000
const MIN_STABLE_TIME_MS = 180
const MIN_NOTE_DURATION_SECONDS = 0.12;
const SILENCE_RMS_THRESHOLD = 0.01

function frequencyToNote(frequency: number) {
  const midiNumber = Math.round(69 + 12 * Math.log2(frequency / 440))
  const noteName = NOTE_NAMES[((midiNumber % 12) + 12) % 12]
  const octave = Math.floor(midiNumber / 12) - 1

  const exactFrequency = 440 * Math.pow(2, (midiNumber - 69) / 12)
  const cents = Math.round(1200 * Math.log2(frequency / exactFrequency))

  return {
    note: `${noteName}${octave}`,
    cents,
  }
}

function getRms(input: Float32Array) {
  let sum = 0

  for (const sample of input) {
    sum += sample * sample
  }

  return Math.sqrt(sum / input.length)
}

function App() {
  const [isListening, setIsListening] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [detectedPitch, setDetectedPitch] = useState<DetectedPitch | null>(null)
  const [noteBlocks, setNoteBlocks] = useState<NoteBlock[]>([])
  const [error, setError] = useState(" ")

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const detectorRef = useRef<PitchDetector<Float32Array> | null>(null)

  const candidateNoteRef = useRef<CandidateNote | null>(null)
  const stableNoteRef = useRef<string | null>(null)

  const isRecordingRef = useRef(false)
  const recordingStartTimeRef = useRef(0)
  const currentRecordedNoteRef = useRef<CurrentRecordedNote | null>(null)

  async function startListening() {
    try {
      setError(" ");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      })

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream)

      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048

      source.connect(analyser)
      
      audioContextRef.current = audioContext
      analyserRef.current = analyser
      streamRef.current = stream
      detectorRef.current = PitchDetector.forFloat32Array(analyser.fftSize)

      setIsListening(true)
      detectPitch()
    } catch (err) {
      console.error(err)
      setError("Could not access microphone. Check browser microphone permission.")
    }
  }

  function stopListening() {
    stopRecording()

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    streamRef.current?.getTracks().forEach((track) => track.stop())
    audioContextRef.current?.close()

    audioContextRef.current = null
    analyserRef.current = null
    streamRef.current = null
    animationFrameRef.current = null
    detectorRef.current = null

    candidateNoteRef.current = null
    stableNoteRef.current = null

    setIsListening(false)
    setDetectedPitch(null)
  }

  function startRecording() {
    setNoteBlocks([])
    setIsRecording(true)

    isRecordingRef.current = true
    recordingStartTimeRef.current = performance.now() / 1000
    currentRecordedNoteRef.current = null
  }

  function stopRecording() {
    const now = performance.now() / 1000
    finishCurrentRecordedNote(now)

    setIsRecording(false)
    isRecordingRef.current = false
    currentRecordedNoteRef.current = null
  }

  function finishCurrentRecordedNote(now: number) {
    const currentNote = currentRecordedNoteRef.current

    if (!currentNote) return

    const duration = now - currentNote.startTime

    if (duration >= MIN_NOTE_DURATION_SECONDS) {
      setNoteBlocks((previousBlocks) => [
        ...previousBlocks,
        {
          id: Date.now() + Math.random(),
          note: currentNote.note,
          startTime: currentNote.startTime - recordingStartTimeRef.current,
          endTime: now - recordingStartTimeRef.current,
          duration,
        }
      ])
    }

    currentRecordedNoteRef.current = null
  }

  function handleStableNote(note: string) {
    const now = performance.now() / 1000
    if (!isRecordingRef.current) return
    const currentNote = currentRecordedNoteRef.current
    if (!currentNote) {
      currentRecordedNoteRef.current = {
        note,
        startTime: now
      }
      return
    }

    if (currentNote.note !== note) {
      finishCurrentRecordedNote(now)
      currentRecordedNoteRef.current = {
        note,
        startTime: now
      }
    }
  }

  function handleNoReliablePitch() {
    const now = performance.now() / 1000;
    candidateNoteRef.current = null;
    setDetectedPitch(null)

    if (isRecordingRef.current) {
      finishCurrentRecordedNote(now)
    }
  }

  function detectPitch() {
    const audioContext = audioContextRef.current
    const analyser = analyserRef.current
    const detector = detectorRef.current

    if (!audioContext || !analyser || !detector) return

    const input = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(input)

    const rms = getRms(input)

    if (rms < SILENCE_RMS_THRESHOLD) {
      handleNoReliablePitch()
      animationFrameRef.current = requestAnimationFrame(detectPitch)
      return
    }

    const [pitch, clarity] = detector.findPitch(input, audioContext.sampleRate)

    const isReliablePitch = clarity > MIN_CLARITY && pitch > MIN_FREQUENCY && pitch < MAX_FREQUENCY

    if (!isReliablePitch) {
      handleNoReliablePitch()
      animationFrameRef.current = requestAnimationFrame(detectPitch)
      return
    }

    const { note, cents } = frequencyToNote(pitch)
    const nowMs = performance.now()

    const candidateNote = candidateNoteRef.current

    if (!candidateNote || candidateNote.note !== note) {
      candidateNoteRef.current = {
        note,
        firstSeenAt: nowMs
      }

      animationFrameRef.current = requestAnimationFrame(detectPitch)
      return
    }

    const noteHasBeenStableFor = nowMs - candidateNote.firstSeenAt

    if (noteHasBeenStableFor >= MIN_STABLE_TIME_MS) {
      stableNoteRef.current = note

      setDetectedPitch({
        frequency: pitch,
        note,
        cents,
        clarity,
      })

      handleStableNote(note)
    }

    animationFrameRef.current = requestAnimationFrame(detectPitch)
  }

  return (
    <main className="app">
      <section className="card">
        <h1>HumScore</h1>
        <p className="subtitle">
          Sing or hum a note. The app will detect the pitch and write it down.
        </p>

        <div className="button-row">
          {!isListening ? (
            <button onClick={startListening}>Start Listening</button>
          ): (
            <button onClick={stopListening}>Stop Listening</button>
          )}

          {isListening && !isRecording && (
            <button className="secondary-button" onClick={startRecording}>
              Start Recording
            </button>
          )}

          {isListening && isRecording && (
            <button className="danger-button" onClick={stopRecording}>
              Stop Recording
            </button>
          )}
        </div>

        {error && <p className="error">{error}</p>}

        <div className="pitch-display">
          <p className="label">Detected Note</p>
          <p className="note">{detectedPitch ? detectedPitch.note : "--"}</p>

          <p className="details">
            {detectedPitch 
            ? `${detectedPitch.frequency.toFixed(1)} Hz | ${detectedPitch.cents} cents | clarity ${detectedPitch.clarity.toFixed(2)}`
            : "Waiting for sound..."}
          </p>
        </div>

        <section className="recording-section">
          <div className="recording-header">
            <h2>Recorded Notes</h2>
            <p>{isRecording ? "Recording..." : "Not recording"}</p>
          </div>

          {noteBlocks.length === 0 ? (
            <p className="empty-message">No notes recorded yet.</p>
          ) : (
            <div className="note-list">
              {noteBlocks.map((block) => (
                <div className="note-block" key={block.id}>
                  <span className="note-name">{block.note}</span>
                  <span>{block.duration.toFixed(2)}s</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

export default App
