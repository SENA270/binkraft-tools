"use client";

import { useCallback, useRef, useEffect } from "react";
import { type DrumNote, GM_DRUM_NAMES_JA, GM_DRUM_MAP } from "../lib/types";

interface DrumGridProps {
  notes: DrumNote[];
  instruments: number[];
  measures: number;
  ticksPerBeat: number;
  timeSignatureNumerator: number;
  playheadTick: number;
  onToggleNote: (note: number, tick: number) => void;
  onVelocityEdit: (
    note: number,
    tick: number,
    x: number,
    y: number
  ) => void;
}

export default function DrumGrid({
  notes,
  instruments,
  measures,
  ticksPerBeat,
  timeSignatureNumerator,
  playheadTick,
  onToggleNote,
  onVelocityEdit,
}: DrumGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridCellsPerMeasure = timeSignatureNumerator * ticksPerBeat;
  const totalCells = measures * gridCellsPerMeasure;

  const CELL_W = 28;
  const CELL_H = 32;
  const LABEL_W = 120;

  // Build a lookup map for fast access
  const noteMap = useRef(new Map<string, DrumNote>());
  noteMap.current.clear();
  for (const n of notes) {
    noteMap.current.set(`${n.note}-${n.tick}`, n);
  }

  const getNote = useCallback(
    (instrument: number, tick: number): DrumNote | undefined => {
      return noteMap.current.get(`${instrument}-${tick}`);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notes]
  );

  // Auto-scroll to playhead
  useEffect(() => {
    if (playheadTick >= 0 && scrollRef.current) {
      const playheadX = playheadTick * CELL_W;
      const container = scrollRef.current;
      const viewLeft = container.scrollLeft;
      const viewRight = viewLeft + container.clientWidth - LABEL_W;
      if (playheadX < viewLeft || playheadX > viewRight - CELL_W * 4) {
        container.scrollLeft = Math.max(0, playheadX - CELL_W * 2);
      }
    }
  }, [playheadTick]);

  function handleCellClick(
    instrument: number,
    tick: number,
    e: React.MouseEvent
  ) {
    if (e.button === 2) {
      // Right click = velocity edit
      e.preventDefault();
      const existing = getNote(instrument, tick);
      if (existing) {
        onVelocityEdit(instrument, tick, e.clientX, e.clientY);
      }
      return;
    }
    onToggleNote(instrument, tick);
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Instrument labels (fixed left) */}
      <div
        className="shrink-0 bg-zinc-800 border-r border-zinc-600 z-10"
        style={{ width: LABEL_W }}
      >
        {/* Header row */}
        <div
          className="flex items-center justify-center text-[10px] text-zinc-500 border-b border-zinc-700 bg-zinc-850"
          style={{ height: 24 }}
        >
          楽器
        </div>
        {instruments.map((inst) => (
          <div
            key={inst}
            className="flex items-center px-2 border-b border-zinc-700/50 text-xs text-zinc-300 truncate"
            style={{ height: CELL_H }}
            title={GM_DRUM_MAP[inst] || `Note ${inst}`}
          >
            {GM_DRUM_NAMES_JA[inst] || GM_DRUM_MAP[inst] || `#${inst}`}
          </div>
        ))}
      </div>

      {/* Scrollable grid */}
      <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden">
        <div style={{ width: totalCells * CELL_W, position: "relative" }}>
          {/* Measure numbers */}
          <div className="flex" style={{ height: 24 }}>
            {Array.from({ length: measures }, (_, m) => (
              <div
                key={m}
                className="text-[10px] text-zinc-500 border-b border-zinc-700 flex items-center pl-1"
                style={{ width: gridCellsPerMeasure * CELL_W }}
              >
                {m + 1}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {instruments.map((inst) => (
            <div
              key={inst}
              className="flex"
              style={{ height: CELL_H }}
              onContextMenu={handleContextMenu}
            >
              {Array.from({ length: totalCells }, (_, tick) => {
                const existing = getNote(inst, tick);
                const isBeat = tick % ticksPerBeat === 0;
                const isMeasure = tick % gridCellsPerMeasure === 0;
                const isPlayhead =
                  playheadTick >= 0 && tick === Math.floor(playheadTick);

                return (
                  <div
                    key={tick}
                    className={`shrink-0 border-b border-r cursor-pointer transition-colors duration-75 flex items-center justify-center ${
                      isMeasure
                        ? "border-l border-l-zinc-500"
                        : isBeat
                          ? "border-l border-l-zinc-600"
                          : ""
                    } ${
                      isPlayhead
                        ? "bg-amber-500/20"
                        : tick % 2 === 0
                          ? "bg-zinc-800"
                          : "bg-zinc-800/70"
                    } border-zinc-700/40 hover:bg-zinc-700/60`}
                    style={{ width: CELL_W, height: CELL_H }}
                    onMouseDown={(e) => handleCellClick(inst, tick, e)}
                  >
                    {existing && (
                      <div
                        className="rounded-sm"
                        style={{
                          width: CELL_W - 6,
                          height: CELL_H - 8,
                          backgroundColor: `rgba(251, 191, 36, ${
                            0.25 + (existing.velocity / 127) * 0.75
                          })`,
                          border: "1px solid rgba(251, 191, 36, 0.6)",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Playhead line */}
          {playheadTick >= 0 && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-amber-400 pointer-events-none z-20"
              style={{
                left: playheadTick * CELL_W + CELL_W / 2,
                top: 0,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
