import { useRef, useState } from 'react'
import { PitchDetector } from 'pitchy'
import './App.css'

type LivePitch = {
  frequency: number,
  note: string,
  rawNote: string,
  cents: number,
  clarity: number,
  volume: number
}

type PitchFrame = {
  time: number,
  frequency: number,
  rawNote: string,
  correctedNote: string,
  correctedMidi: number,
  cents: number,
  clarity: number,
  volume: number
}

type NoteBlock = {
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

type CalibrationPoint = {
  id: number,
  selectedNote: string,
  selectedMidi: number,
  detectedFrequency: number,
  offsetCents: number,
}

type CalibrationChoice = {
  note: string,
  midi: number
}

type PendingCalibration = {
  detectedFrequency: number,
  detectedNote: string,
  choices: CalibrationChoice[]
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

const MIN_FREQUENCY = 50
const MAX_FREQUENCY = 1000

const MIN_RECORDING_CLARITY = 0.55
const MIN_RECORDING_VOLUME = 0.006

const GOOD_CLARITY = 0.75
const GOOD_VOLUME = 0.012

const MIN_UNCERTAIN_DURATION = 0.05
const MIN_STRONG_DURATION = 0.18
const MAX_GAP_BETWEEN_FRAMES = 0.14


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
function midiToFrequency(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

function frequencyToMidiFloat(frequency: number) {
  return 69 + 12 * Math.log2(frequency / 440)
}

function midiToNote(midi: number) {
  const noteName = NOTE_NAMES[((midi % 12) + 12) % 12]
  const octave = Math.floor(midi / 12) - 1
  return `${noteName}${octave}`
}

function frequencyToNoteInfo(frequency: number) {
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

function getRms(input: Float32Array) {
  let sum = 0

  for (const sample of input) {
    sum += sample * sample
  }

  return Math.sqrt(sum / input.length)
}

function getMedian(numbers: number[]) {
  if (numbers.length === 0) return 0;

  const sorted = [...numbers].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  }

  return sorted[middle]
}

function getCalibrationOffsetForMidi(
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

function applyCalibrationToFrequency(
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

function processPitchFrames(frames: PitchFrame[]) {
  const blocks: NoteBlock[] = []

  if (frames.length === 0) return blocks

  let currentGroup: PitchFrame[] = [frames[0]]

  function finishGroup(group: PitchFrame[]) {
    if (group.length === 0) return

    const first = group[0]
    const last = group[group.length - 1]

    const start = first.time
    const duration = Math.max(last.time - first.time, 0.05)
    const end = start + duration

    const averageClarity =
      group.reduce((sum, frame) => sum + frame.clarity, 0) / group.length

    const averageVolume =
      group.reduce((sum, frame) => sum + frame.volume, 0) / group.length

    if (duration < MIN_UNCERTAIN_DURATION) return

    const confidence =
      duration >= MIN_STRONG_DURATION &&
      averageClarity >= GOOD_CLARITY &&
      averageVolume >= GOOD_VOLUME
        ? "strong"
        : "uncertain"

    blocks.push({
      id: Date.now() + Math.random(),
      note: first.correctedNote,
      midi: first.correctedMidi,
      start,
      end,
      duration,
      confidence,
      averageClarity,
      averageVolume
    })
  }

  for (let i = 1; i < frames.length; i++) {
    const previousFrame = frames[i - 1]
    const currentFrame = frames[i]

    const sameNote = currentFrame.correctedNote === previousFrame.correctedNote
    const smallGap =
      currentFrame.time - previousFrame.time <= MAX_GAP_BETWEEN_FRAMES

    if (sameNote && smallGap) {
      currentGroup.push(currentFrame)
    } else {
      finishGroup(currentGroup)
      currentGroup = [currentFrame]
    }
  }

  finishGroup(currentGroup)

  return blocks;
}

function App() {
  const [isListening, setIsListening] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isCalibrating, setIsCalibrating] = useState(false)

  const [livePitch, setLivePitch] = useState<LivePitch | null>(null)
  const [calibrationPoints, setCalibrationPoints] = useState<CalibrationPoint[]>([])
  const [pendingCalibration, setPendingCalibration] = useState<PendingCalibration | null>(null)
  
  const [noteBlocks, setNoteBlocks] = useState<NoteBlock[]>([])
  const [audioUrl, setAudioUrl] = useState("")
  const [error, setError] = useState(" ")

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const detectorRef = useRef<ReturnType<typeof PitchDetector.forFloat32Array> | null>(null)

  const calibrationPointsRef = useRef<CalibrationPoint[]>([])

  const calibrationSamplesRef = useRef<number[]>([])
  const calibrationTimeoutRef = useRef<number | null>(null)

  const isRecordingRef = useRef(false)
  const recordingStartTimeRef = useRef(0)
  const pitchFramesRef = useRef<PitchFrame[]>([])

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  const playbackContextRef = useRef<AudioContext | null>(null)

  const timelineDuration = Math.max(
    ...noteBlocks.map((block) => block.end),
    1
  )

  async function startListening() {
    try {
      setError(" ")

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      })

      const audioContext = new AudioContext()
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

    if (calibrationTimeoutRef.current !== null) {
      window.clearTimeout(calibrationTimeoutRef.current)
    }

    streamRef.current?.getTracks().forEach((track) => track.stop())
    audioContextRef.current?.close()

    audioContextRef.current = null
    analyserRef.current = null
    streamRef.current = null
    animationFrameRef.current = null
    detectorRef.current = null

    setIsListening(false)
    setIsCalibrating(false)
    setLivePitch(null)
  }

  function startCalibrationCapture() {
    if (!isListening) {
      setError("Start listening first.")
      return
    }

    setError("")
    setPendingCalibration(null)
    setIsCalibrating(true)
    calibrationSamplesRef.current = []

    calibrationTimeoutRef.current = window.setTimeout(() => {
      finishCalibrationCapture()
    }, 1300)
  }

  function finishCalibrationCapture() {
    const samples = calibrationSamplesRef.current

    setIsCalibrating(false)

    if (samples.length < 5) {
      setError("I could not hear a clear calibration note. Try humming louder and steadier.")
      return
    }

    const detectedFrequency = getMedian(samples)
    const detectedInfo = frequencyToNoteInfo(detectedFrequency)

    const choices = [-2, -1, 0, 1, 2].map((offset) => {
      const midi = detectedInfo.midi + offset

      return {
        note: midiToNote(midi),
        midi
      }
    })

    setPendingCalibration({
      detectedFrequency,
      detectedNote: detectedInfo.note,
      choices
    })
  }

  function chooseCalibrationNote(choice: CalibrationChoice) {
    if (!pendingCalibration) return

    const intendedFrequency = midiToFrequency(choice.midi)

    const offsetCents = Math.round(
      1200 * Math.log2(pendingCalibration.detectedFrequency / intendedFrequency)
    )

    const newPoint: CalibrationPoint = {
      id: Date.now() + Math.random(),
      selectedNote: choice.note,
      selectedMidi: choice.midi,
      detectedFrequency: pendingCalibration.detectedFrequency,
      offsetCents
    }

    setCalibrationPoints((previousPoints) => {
      const nextPoints = [...previousPoints, newPoint].slice(-3)
      calibrationPointsRef.current = nextPoints
      return nextPoints
    })

    setPendingCalibration(null)
  }

  function clearCalibration() {
    setCalibrationPoints([])
    calibrationPointsRef.current = []
    setPendingCalibration(null)
  }

  function startRecording() {
    if (!streamRef.current) {
      setError("Start listening first.")
      return
    }

    setError("")
    setNoteBlocks([])
    pitchFramesRef.current = []
    recordingStartTimeRef.current = performance.now() / 1000
    isRecordingRef.current = true
    setIsRecording(true)

    audioChunksRef.current = []

    const recorder = new MediaRecorder(streamRef.current)
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data)
      }
    }

    recorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      })

      const newAudioUrl = URL.createObjectURL(audioBlob)

      setAudioUrl((oldAudioUrl) => {
        if (oldAudioUrl) {
          URL.revokeObjectURL(oldAudioUrl)
        }

        return newAudioUrl
      })
    }

    recorder.start()
  }

  function stopRecording() {
    if (!isRecordingRef.current) return

    isRecordingRef.current = false

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
    }

    const processedBlocks = processPitchFrames(pitchFramesRef.current)
    setNoteBlocks(processedBlocks)
  }

  function playSingleGeneratedNote(block: NoteBlock) {
    const context = getPlaybackContext()
    const startTime = context.currentTime + 0.05

    scheduleGeneratedNote(context, block.midi, startTime, 0.6, 0.16)
  }

  async function playVoiceAndGeneratedNotes() {
    if (!audioUrl || !audioPlayerRef.current) {
      setError("Record something first.")
      return
    }

    const context = getPlaybackContext()

    if (context.state === "suspended") {
      await context.resume()
    }

    const startDelayMs = 150
    const startTime = context.currentTime + startDelayMs / 1000

    for (const block of noteBlocks) {
      const volume = block.confidence === "strong" ? 0.13 : 0.05
      scheduleGeneratedNote(
        context,
        block.midi,
        startTime + block.start,
        block.duration,
        volume
      );
    }

    audioPlayerRef.current.currentTime = 0

    window.setTimeout(() => {
      audioPlayerRef.current?.play()
    }, startDelayMs)
  }

  function getPlaybackContext() {
    if (!playbackContextRef.current) {
      playbackContextRef.current = new AudioContext()
    }

    return playbackContextRef.current
  }

  function scheduleGeneratedNote(
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

  function detectPitch() {
    const audioContext = audioContextRef.current
    const analyser = analyserRef.current
    const detector = detectorRef.current

    if (!audioContext || !analyser || !detector) return

    const input = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(input)

    const volume = getRms(input)
    const [pitch, clarity] = detector.findPitch(input, audioContext.sampleRate)

    const reliableEnough =
      clarity >= MIN_RECORDING_CLARITY &&
      volume >= MIN_RECORDING_VOLUME &&
      pitch >= MIN_FREQUENCY &&
      pitch <= MAX_FREQUENCY

    if (reliableEnough) {
      const rawInfo = frequencyToNoteInfo(pitch)

      const correctedFrequency = applyCalibrationToFrequency(
        pitch,
        calibrationPointsRef.current
      )

      const correctedInfo = frequencyToNoteInfo(correctedFrequency)

      setLivePitch({
        frequency: correctedFrequency,
        note: correctedInfo.note,
        rawNote: rawInfo.note,
        cents: correctedInfo.cents,
        clarity,
        volume,
      })

      if (isCalibrating) {
        calibrationSamplesRef.current.push(pitch)
      }

      if (isRecordingRef.current) {
        const now = performance.now() / 1000

        pitchFramesRef.current.push({
          time: now - recordingStartTimeRef.current,
          frequency: pitch,
          rawNote: rawInfo.note,
          correctedNote: correctedInfo.note,
          correctedMidi: correctedInfo.midi,
          cents: correctedInfo.cents,
          clarity,
          volume
        })
      }
    }

    animationFrameRef.current = requestAnimationFrame(detectPitch)
  }

  return (
    <main className='app'>
      <section className='card'>
        <h1>HumScore</h1>
        <p className='subtitle'>
          Sing or hum a note. The app will detect the pitch and write it down. Clean it up after.
        </p>

        <section className='panel'>
          <h2>1. Microphone</h2>
          <div className='button-row'>
            {!isListening ? (
              <button onClick={startListening}>Start Listening</button>
            ) : (
              <button className='danger-button' onClick={stopListening}>
                Stop Listening
              </button>
            )}
        </div>

        {livePitch ? (
          <div className='live-pitch'>
            <p className='label'>Live detected note</p>
            <p className='note'>{livePitch.note}</p>
            <p className='details'>
              raw: {livePitch.rawNote} | {livePitch.frequency.toFixed(1)} Hz |{" "}
              {livePitch.cents} cents | clarity {livePitch.clarity.toFixed(2)}
            </p>
          </div>
        ) : (
          <p className="empty-message">Waiting for sound...</p>
        )}
        </section>

        <section className='panel'>
          <div className='section-heading'>
            <h2>2. Calibration</h2>
            <p>{calibrationPoints.length}/3 saved</p>
          </div>

          <p className='helper-text'>
            Hum a low, middle, and high comfortable note. After each hum, choose
            the note you intended.
          </p>

          <div className='button-row'>
            <button 
              className='secondary-button' 
              onClick={startCalibrationCapture} 
              disabled={!isListening || isCalibrating} 
            >
              {isCalibrating ? "Listening..." : "Capture Calibration Note"}
            </button>

            <button className='light-button' onClick={clearCalibration}>
              Clear Calibration
            </button>
          </div>

          {pendingCalibration && (
            <div className='choice-box'>
              <p>
                I heard around <strong>{pendingCalibration.detectedNote}</strong>.
                Which note did you intend?
              </p>

              <div className='choice-row'>
                {pendingCalibration.choices.map((choice) => (
                  <button
                    className='choice-button'
                    key={choice.note}
                    onClick={() => chooseCalibrationNote(choice)}
                  >
                    {choice.note}
                  </button>
                ))}
              </div>
            </div>
          )}

          {calibrationPoints.length > 0 && (
            <div className='calibration-list'>
              {calibrationPoints.map((point) => (
                <div className='calibration-item' key={point.id}>
                  <span>{point.selectedNote}</span>
                  <span>
                    {point.offsetCents > 0 ? "+" : ""}
                    {point.offsetCents} cents
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className='panel'>
          <h2>3. Record Melody</h2>

          <div className='button-row'>
            {!isRecording ? (
              <button onClick={startRecording} disabled={!isListening}>
                Start Recording
              </button>
            ) : (
              <button className='danger-button' onClick={stopRecording}>
                Stop Recording
              </button>
            )}

            <button
              className='secondary-button'
              onClick={playVoiceAndGeneratedNotes}
              disabled={!audioUrl || noteBlocks.length === 0}
            >
              Play Voice + Notes
            </button>
          </div>

          {audioUrl && (
            <audio ref={audioPlayerRef} src={audioUrl} controls className='audio' />
          )}
        </section>

        <section className='panel'>
          <div className='section-heading'>
            <h2>4. Timeline</h2>
            <p>
              black = confident, grey = uncertain. Click a block to hear that note.
            </p>
          </div>

          {noteBlocks.length === 0 ? (
            <p className='empty-message'>No notes recorded yet.</p>
          ) : (
            <div className='timeline'>
              {noteBlocks.map((block) => {
                const left = (block.start / timelineDuration) * 100;
                const width = Math.max(
                  (block.duration / timelineDuration) * 100,
                  3
                );

                return (
                  <button
                    key={block.id}
                    className={`timeline-block ${block.confidence}`}
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                    }}
                    onClick={() => playSingleGeneratedNote(block)}
                    title={`${block.note} | ${block.duration.toFixed(2)}s | ${block.confidence}`}
                  >
                    {block.note}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {error && <p className='error'>{error}</p>}
      </section>
    </main>
  )
}

export default App
