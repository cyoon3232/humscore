import { useRef, useState } from 'react'
import { PitchDetector } from 'pitchy'
import './App.css'

type DetectedPitch = {
  frequency: number,
  note: string,
  cents: number,
  clarity: number
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

function App() {
  const [isListening, setIsListening] = useState(false)
  const [detectedPitch, setDetectedPitch] = useState<DetectedPitch | null>(null)
  const [error, setError] = useState(" ")

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)

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

      setIsListening(true)
      detectPitch()
    } catch (err) {
      console.error(err)
      setError("Could not access microphone. Check browser microphone permission.")
    }
  }

  function stopListening() {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    streamRef.current?.getTracks().forEach((track) => track.stop())
    audioContextRef.current?.close()

    audioContextRef.current = null
    analyserRef.current = null
    streamRef.current = null
    animationFrameRef.current = null

    setIsListening(false)
    setDetectedPitch(null)
  }

  function detectPitch() {
    const audioContext = audioContextRef.current
    const analyser = analyserRef.current

    if (!audioContext || !analyser) return

    const input = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(input)

    const detector = PitchDetector.forFloat32Array(input.length)
    const [pitch, clarity] = detector.findPitch(input, audioContext.sampleRate)

    if (clarity > 0.9 && pitch > 50 && pitch < 1000) {
      const { note, cents } = frequencyToNote(pitch)

      setDetectedPitch({
        frequency: pitch,
        note,
        cents,
        clarity,
      })
    }

    animationFrameRef.current = requestAnimationFrame(detectPitch)
  }

  return (
    <main className="app">
      <section className="card">
        <h1>HumScore</h1>
        <p className="subtitle">Sing or hum a note. The app will detect the pitch and write it down.</p>

        {!isListening ? (
          <button onClick={startListening}>Start Listening</button>
        ): (
          <button onClick={stopListening}>Stop Listening</button>
        )}

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
      </section>
    </main>
  )
}

export default App
