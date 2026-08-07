import { useRef, useState } from 'react'
import { PitchDetector } from 'pitchy'
import './App.css'

import type {
  LivePitch,
  PitchFrame,
  NoteBlock,
  CalibrationChoice,
  CalibrationPoint,
  PendingCalibration,
  CalibrationDebug
} from "./types"

import {
  frequencyToNoteInfo,
  getMedian,
  getRms,
  midiToFrequency,
  midiToNote,
} from "./music/noteUtils"

import {
  createEmptyCalibrationDebug,
  evaluateCalibrationSample,
  updateCalibrationDebug
} from "./music/calibrationCapture"

import { applyCalibrationToFrequency } from "./music/calibration"
import { processPitchFrames } from "./music/pitchProcessing"
import { scheduleGeneratedNote } from "./music/playback"

import PianoRoll from './components/PianoRoll'

const MIN_FREQUENCY = 50
const MAX_FREQUENCY = 1000
const MIN_RECORDING_CLARITY = 0.55
const MIN_RECORDING_VOLUME = 0.006

const MIN_CALIBRATION_CLARITY = 0.3
const MIN_CALIBRATION_VOLUME = 0.0025
const MIN_CALIBRATION_SAMPLES = 3
const CALIBRATION_CAPTURE_MS = 1800

function App() {
  const [isListening, setIsListening] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isCalibrating, setIsCalibrating] = useState(false)

  const [livePitch, setLivePitch] = useState<LivePitch | null>(null)
  const [calibrationPoints, setCalibrationPoints] = useState<CalibrationPoint[]>([])
  const [pendingCalibration, setPendingCalibration] = useState<PendingCalibration | null>(null)

  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null)
  
  const [noteBlocks, setNoteBlocks] = useState<NoteBlock[]>([])
  const [audioUrl, setAudioUrl] = useState("")
  const [error, setError] = useState(" ")

  const [calibrationDebug, setCalibrationDebug] = useState<CalibrationDebug>(
    createEmptyCalibrationDebug()
  )

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const detectorRef = useRef<ReturnType<typeof PitchDetector.forFloat32Array> | null>(null)

  const calibrationPointsRef = useRef<CalibrationPoint[]>([])

  const isCalibratingRef = useRef(false)
  const calibrationSamplesRef = useRef<number[]>([])
  const calibrationDebugRef = useRef<CalibrationDebug>(
    createEmptyCalibrationDebug()
  )
  const calibrationTimeoutRef = useRef<number | null>(null)

  const isRecordingRef = useRef(false)
  const recordingStartTimeRef = useRef(0)
  const pitchFramesRef = useRef<PitchFrame[]>([])

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  const playbackContextRef = useRef<AudioContext | null>(null)

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
    isCalibratingRef.current = false
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
    isCalibratingRef.current = true

    calibrationSamplesRef.current = []

    const emptyDebug = createEmptyCalibrationDebug()
    calibrationDebugRef.current = emptyDebug
    setCalibrationDebug(emptyDebug)

    calibrationTimeoutRef.current = window.setTimeout(() => {
      finishCalibrationCapture()
    }, CALIBRATION_CAPTURE_MS)
  }

  function finishCalibrationCapture() {
    const samples = calibrationSamplesRef.current

    setIsCalibrating(false)
    isCalibratingRef.current = false
    setCalibrationDebug({ ...calibrationDebugRef.current })

    if (samples.length < MIN_CALIBRATION_SAMPLES) {
      setError(
        `Calibration failed. Accepted ${samples.length} samples. ` +
        `Try again but check the debug numbers below.`
      )
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
    setIsRecording(false)

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

  function detectPitch() {
    const audioContext = audioContextRef.current
    const analyser = analyserRef.current
    const detector = detectorRef.current

    if (!audioContext || !analyser || !detector) return

    const input = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(input)

    const volume = getRms(input)
    const [pitch, clarity] = detector.findPitch(input, audioContext.sampleRate)

    if (isCalibratingRef.current) {
      const debug = calibrationDebugRef.current

      debug.framesSeen += 1
      debug.lastPitch = Number.isFinite(pitch) ? pitch : null
      debug.lastClarity = clarity
      debug.lastVolume = volume

      const pitchInRange = pitch >= MIN_FREQUENCY && pitch <= MAX_FREQUENCY
      const clearEnoughForCalibration = clarity >= MIN_CALIBRATION_CLARITY
      const loudEnoughForCalibration = volume >= MIN_CALIBRATION_VOLUME

      if (!pitchInRange) {
        debug.rejectedOutOfRange += 1
      } else if (!clearEnoughForCalibration) {
        debug.rejectedLowClarity += 1
      } else if (!loudEnoughForCalibration) {
        debug.rejectedLowVolume += 1
      } else {
        calibrationSamplesRef.current.push(pitch)
        debug.acceptedSamples = calibrationSamplesRef.current.length
      }

      calibrationDebugRef.current = debug
      setCalibrationDebug({ ...debug })
    }

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

          <div className="debug-box">
            <p>
              Calibration debug: accepted {calibrationDebug.acceptedSamples} /{" "}
              {calibrationDebug.framesSeen} frames
            </p>
            <p>
              low clarity: {calibrationDebug.rejectedLowClarity} | low volume:{" "}
              {calibrationDebug.rejectedLowVolume} | out of range:{" "}
              {calibrationDebug.rejectedOutOfRange}
            </p>
            <p>
              last pitch:{" "}
              {calibrationDebug.lastPitch
                ? `${calibrationDebug.lastPitch.toFixed(1)} Hz`
                : "--"}{" "}
              | clarity:{" "}
              {calibrationDebug.lastClarity
                ? calibrationDebug.lastClarity.toFixed(2)
                : "--"}{" "}
              | volume:{" "}
              {calibrationDebug.lastVolume
                ? calibrationDebug.lastVolume.toFixed(4)
                : "--"}
            </p>
          </div>
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

          <PianoRoll noteBlocks={noteBlocks} onPlayNote={playSingleGeneratedNote} />
        
        </section>

        {error && <p className='error'>{error}</p>}
      </section>
    </main>
  )
}

export default App
