import {
  MAX_BEATS_PER_BAR,
  MAX_TEMPO_BPM,
  MIN_BEATS_PER_BAR,
  MIN_TEMPO_BPM,
  normalizeBeatsPerBar,
  normalizeTempoBpm,
} from "../music/rhythm"

type RhythmControlsProps = {
  tempoBpm: number
  beatsPerBar: number
  onTempoBpmChange: (tempoBpm: number) => void
  onBeatsPerBarChange: (beatsPerBar: number) => void
}

function RhythmControls({
  tempoBpm,
  beatsPerBar,
  onTempoBpmChange,
  onBeatsPerBarChange,
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
      </div>
    </section>
  )
}

export default RhythmControls