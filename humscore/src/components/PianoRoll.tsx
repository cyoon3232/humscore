import type { NoteBlock } from "../types"
import { midiToNote } from "../music/noteUtils"
import { getBeatMarkers } from "../music/rhythm"

/**
 * Piano-roll timeline for displaying detected notes by time and pitch.
 */

const GRID_ROW_HEIGHT = 34
const GRID_NOTE_PADDING = 4
const MIN_TIMELINE_SECONDS = 1
const PIXELS_PER_SECOND = 140
const MIN_TIMELINE_WIDTH = 900

type PianoRollProps = {
  noteBlocks: NoteBlock[]
  tempoBpm: number
  beatsPerBar: number
  onPlayNote: (block: NoteBlock) => void
}

/** Builds the visible pitch rows around the recorded note range. */
function getTimelineRows(blocks: NoteBlock[]) {
  if (blocks.length === 0) return []

  const midiValues = blocks.map((block) => block.midi)

  const lowestMidi = Math.max(Math.min(...midiValues) - 2, 0)
  const highestMidi = Math.min(Math.max(...midiValues) + 2, 127)

  const rows = []

  for (let midi = highestMidi; midi >= lowestMidi; midi--) {
    rows.push({
      midi,
      note: midiToNote(midi),
    })
  }

  return rows
}

/** Renders note blocks on a scrollable pitch/time grid. */
function PianoRoll({ 
  noteBlocks,
  tempoBpm,
  beatsPerBar,
  onPlayNote
}: PianoRollProps) {
    const timelineDuration = Math.max(
        ...noteBlocks.map((block) => block.end),
        MIN_TIMELINE_SECONDS
    )

    const timelineRows = getTimelineRows(noteBlocks)
    const highestTimelineMidi = timelineRows.length > 0 ? timelineRows[0].midi : 0
    const timelineHeight = timelineRows.length * GRID_ROW_HEIGHT
    const timelineWidth = Math.max(
        timelineDuration * PIXELS_PER_SECOND,
        MIN_TIMELINE_WIDTH
    )
    const gridDuration = timelineWidth / PIXELS_PER_SECOND
    const beatMarkers = getBeatMarkers(gridDuration, tempoBpm, beatsPerBar)

    if (noteBlocks.length === 0) {
        return <p className='empty-message'>No notes recorded yet.</p>
    }

    return (
      <div className='piano-roll'>
        <div className='pitch-labels' style={{ height: `${timelineHeight}px` }}>
          {timelineRows.map((row) => (
              <div className='pitch-label' key={row.midi}>
              {row.note}
              </div>
          ))}
        </div>

        <div className='timeline-scroll'>
          <div className='timeline-grid' 
          style={{ width: `${timelineWidth}px`, height: `${timelineHeight}px` }}>
            {beatMarkers.map((marker) => (
              <div
                className={`beat-line ${marker.isBarStart ? "bar-line" : ""}`}
                key={marker.beatIndex}
                style={{
                  left: `${marker.time * PIXELS_PER_SECOND}px`,
                }}
              >
                {marker.isBarStart && (
                  <span className="bar-label">{marker.barNumber}</span>
                )}
              </div>
            ))}
            
            {timelineRows.map((row) => (
              <div
                className='pitch-row'
                key={row.midi}
                style={{
                    top: `${(highestTimelineMidi - row.midi) * GRID_ROW_HEIGHT}px`,
                }}
              />
            ))}

            {noteBlocks.map((block) => {
              const left = block.start * PIXELS_PER_SECOND
              const width = Math.max(block.duration * PIXELS_PER_SECOND, 18)

              const rowIndex = highestTimelineMidi - block.midi
              const top = rowIndex * GRID_ROW_HEIGHT + GRID_NOTE_PADDING

              return (
                <button
                  key={block.id}
                  className={`timeline-block ${block.confidence}`}
                  style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  top: `${top}px`,
                  height: `${GRID_ROW_HEIGHT - GRID_NOTE_PADDING * 2}px`,
                  }}
                  onClick={() => onPlayNote(block)}
                  title={`${block.note} | ${block.duration.toFixed(2)}s | ${block.confidence}`}
                >
                  {block.note}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
}

export default PianoRoll