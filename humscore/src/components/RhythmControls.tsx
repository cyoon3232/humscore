import {
  MAX_BEATS_PER_BAR,
  MAX_STEPS_PER_BEAT,
  MAX_TEMPO_BPM,
  MIN_BEATS_PER_BAR,
  MIN_STEPS_PER_BEAT,
  MIN_TEMPO_BPM,
  normalizeBeatsPerBar,
  normalizeStepsPerBeat,
  normalizeTempoBpm,
} from "../music/rhythm"

type RhythmControlsProps = {
  tempoBpm: number
  beatsPerBar: number
  stepsPerBeat: number
  isQuantized: boolean
  onTempoBpmChange: (tempoBpm: number) => void
  onBeatsPerBarChange: (beatsPerBar: number) => void
  onStepsPerBeatChange: (stepsPerBeat: number) => void
  onIsQuantizedChange: (isQuantized: boolean) => void
}

function RhythmControls({
  tempoBpm,
  beatsPerBar,
  stepsPerBeat,
  isQuantized,
  onTempoBpmChange,
  onBeatsPerBarChange,
  onStepsPerBeatChange,
  onIsQuantizedChange,
}: RhythmControlsProps) {
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>4. Beat Grid</h2>
        <p>Visual timing grid only. Quantizing comes next.</p>
      </div>

      <div className="rhythm-controls">
        <label className="control-group">
          <span>Tempo</span>
          <input
            type="number"
            min={MIN_TEMPO_BPM}
            max={MAX_TEMPO_BPM}
            value={tempoBpm}
            onChange={(event) =>
              onTempoBpmChange(normalizeTempoBpm(Number(event.target.value)))
            }
          />
          <span className="control-unit">BPM</span>
        </label>

        <label className="control-group">
          <span>Beats per bar</span>
          <input
            type="number"
            min={MIN_BEATS_PER_BAR}
            max={MAX_BEATS_PER_BAR}
            value={beatsPerBar}
            onChange={(event) =>
              onBeatsPerBarChange(
                normalizeBeatsPerBar(Number(event.target.value))
              )
            }
          />
        </label>

        <label className="control-group">
          <span>Grid steps per beat</span>
          <input
            type="number"
            min={MIN_STEPS_PER_BEAT}
            max={MAX_STEPS_PER_BEAT}
            value={stepsPerBeat}
            onChange={(event) =>
              onStepsPerBeatChange(normalizeStepsPerBeat(Number(event.target.value)))
            }
          />
        </label>

        <label className="checkbox-control">
          <input
            type="checkbox"
            checked={isQuantized}
            onChange={(event) => onIsQuantizedChange(event.target.checked)}
          />
          <span>Show quantized notes</span>
        </label>
      </div>
    </section>
  )
}

export default RhythmControls