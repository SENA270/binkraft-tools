"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import {
  type DrumNote,
  type EditorState,
  type Snapshot,
  DEFAULT_BPM,
  DEFAULT_MEASURES,
  DEFAULT_TICKS_PER_BEAT,
  DEFAULT_INSTRUMENTS,
} from "./lib/types";
import { parseMidi, writeMidi } from "./lib/midi";
import { playDrum, getContext } from "./lib/drumSynth";
import TransportBar from "./components/TransportBar";
import DrumGrid from "./components/DrumGrid";
import VelocitySlider from "./components/VelocitySlider";

const DEFAULT_VELOCITY = 100;
const MAX_UNDO = 100;

function createDefaultState(): EditorState {
  return {
    notes: [],
    bpm: DEFAULT_BPM,
    timeSignatureNumerator: 4,
    timeSignatureDenominator: 4,
    measures: DEFAULT_MEASURES,
    ticksPerBeat: DEFAULT_TICKS_PER_BEAT,
    instruments: [...DEFAULT_INSTRUMENTS],
  };
}

function takeSnapshot(state: EditorState): Snapshot {
  return {
    notes: state.notes.map((n) => ({ ...n })),
    instruments: [...state.instruments],
    measures: state.measures,
  };
}

export default function DrumEditorPage() {
  const [state, setState] = useState<EditorState>(createDefaultState);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [playheadTick, setPlayheadTick] = useState(-1);
  const [velocityPopup, setVelocityPopup] = useState<{
    note: number;
    tick: number;
    velocity: number;
    x: number;
    y: number;
  } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Undo/redo stacks
  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);

  // Playback refs
  const playbackRef = useRef<{
    animId: number;
    startTime: number;
    startTick: number;
  } | null>(null);

  const pushUndo = useCallback(() => {
    undoStack.current.push(takeSnapshot(state));
    if (undoStack.current.length > MAX_UNDO) undoStack.current.shift();
    redoStack.current = [];
  }, [state]);

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const snap = undoStack.current.pop()!;
    setState((prev) => {
      redoStack.current.push(takeSnapshot(prev));
      return { ...prev, notes: snap.notes, instruments: snap.instruments, measures: snap.measures };
    });
  }, []);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const snap = redoStack.current.pop()!;
    setState((prev) => {
      undoStack.current.push(takeSnapshot(prev));
      return { ...prev, notes: snap.notes, instruments: snap.instruments, measures: snap.measures };
    });
  }, []);

  // Force re-render for undo/redo button states
  const [, forceRender] = useState(0);
  const pushUndoAndRender = useCallback(() => {
    pushUndo();
    forceRender((n) => n + 1);
  }, [pushUndo]);

  const undoAndRender = useCallback(() => {
    undo();
    forceRender((n) => n + 1);
  }, [undo]);

  const redoAndRender = useCallback(() => {
    redo();
    forceRender((n) => n + 1);
  }, [redo]);

  // Toggle note
  const handleToggleNote = useCallback(
    (note: number, tick: number) => {
      pushUndoAndRender();
      setState((prev) => {
        const idx = prev.notes.findIndex(
          (n) => n.note === note && n.tick === tick
        );
        if (idx >= 0) {
          const newNotes = [...prev.notes];
          newNotes.splice(idx, 1);
          return { ...prev, notes: newNotes };
        } else {
          const newNote: DrumNote = {
            note,
            tick,
            velocity: DEFAULT_VELOCITY,
          };
          playDrum(note, DEFAULT_VELOCITY);
          return { ...prev, notes: [...prev.notes, newNote] };
        }
      });
    },
    [pushUndoAndRender]
  );

  // Velocity edit
  const handleVelocityEdit = useCallback(
    (note: number, tick: number, x: number, y: number) => {
      const existing = state.notes.find(
        (n) => n.note === note && n.tick === tick
      );
      if (existing) {
        setVelocityPopup({
          note,
          tick,
          velocity: existing.velocity,
          x,
          y,
        });
      }
    },
    [state.notes]
  );

  const handleVelocityChange = useCallback(
    (velocity: number) => {
      if (!velocityPopup) return;
      setState((prev) => ({
        ...prev,
        notes: prev.notes.map((n) =>
          n.note === velocityPopup.note && n.tick === velocityPopup.tick
            ? { ...n, velocity }
            : n
        ),
      }));
      setVelocityPopup((p) => (p ? { ...p, velocity } : null));
    },
    [velocityPopup]
  );

  const handleVelocityClose = useCallback(() => {
    if (velocityPopup) {
      pushUndoAndRender();
    }
    setVelocityPopup(null);
  }, [velocityPopup, pushUndoAndRender]);

  // Playback
  const stopPlayback = useCallback(() => {
    if (playbackRef.current) {
      cancelAnimationFrame(playbackRef.current.animId);
      playbackRef.current = null;
    }
    setIsPlaying(false);
    setPlayheadTick(-1);
  }, []);

  const stateRef = useRef(state);
  stateRef.current = state;
  const loopRef = useRef(loop);
  loopRef.current = loop;

  const startPlayback = useCallback(() => {
    // Ensure audio context is running
    getContext();

    const s = stateRef.current;
    const gridCellsPerMeasure =
      s.timeSignatureNumerator * s.ticksPerBeat;
    const totalCells = s.measures * gridCellsPerMeasure;
    const secondsPerCell = 60 / s.bpm / s.ticksPerBeat;

    // Pre-schedule: track which notes have been played
    const playedNotes = new Set<string>();

    setIsPlaying(true);
    const startTime = performance.now();
    const startTick = 0;

    function tick() {
      const elapsed = (performance.now() - startTime) / 1000;
      const currentTick = startTick + elapsed / secondsPerCell;

      if (currentTick >= totalCells) {
        if (loopRef.current) {
          // Restart
          playedNotes.clear();
          const newStartTime = performance.now();
          playbackRef.current = {
            animId: 0,
            startTime: newStartTime,
            startTick: 0,
          };
          setPlayheadTick(0);
          playbackRef.current.animId = requestAnimationFrame(tick);
          return;
        }
        stopPlayback();
        return;
      }

      setPlayheadTick(currentTick);

      // Play notes at current position
      const s = stateRef.current;
      for (const note of s.notes) {
        const key = `${note.note}-${note.tick}`;
        if (
          !playedNotes.has(key) &&
          note.tick <= currentTick &&
          note.tick > currentTick - 1
        ) {
          playedNotes.add(key);
          playDrum(note.note, note.velocity);
        }
      }

      playbackRef.current!.animId = requestAnimationFrame(tick);
    }

    playbackRef.current = {
      animId: requestAnimationFrame(tick),
      startTime,
      startTick,
    };
  }, [stopPlayback]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;

      if (e.key === " ") {
        e.preventDefault();
        if (isPlaying) stopPlayback();
        else startPlayback();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redoAndRender();
        else undoAndRender();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, startPlayback, stopPlayback, undoAndRender, redoAndRender]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playbackRef.current) {
        cancelAnimationFrame(playbackRef.current.animId);
      }
    };
  }, []);

  // Upload MIDI
  const handleUpload = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const result = parseMidi(reader.result as ArrayBuffer);
          undoStack.current = [];
          redoStack.current = [];
          forceRender((n) => n + 1);
          setState(result);
          stopPlayback();
        } catch (err) {
          alert(
            `MIDIファイルの読み込みに失敗しました: ${
              err instanceof Error ? err.message : "不明なエラー"
            }`
          );
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [stopPlayback]
  );

  // Download MIDI
  const handleDownload = useCallback(() => {
    const buffer = writeMidi(state);
    const blob = new Blob([buffer], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "drums.mid";
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  // Drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".mid") || file.name.endsWith(".midi"))) {
        handleUpload(file);
      }
    },
    [handleUpload]
  );

  return (
    <div
      className="flex flex-col h-screen bg-zinc-900 text-zinc-200"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center gap-3 bg-zinc-800 border-b border-zinc-700 px-4 py-2">
        <Link
          href="/"
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          binkraft tools
        </Link>
        <span className="text-zinc-600">/</span>
        <h1 className="text-sm font-bold text-zinc-200">
          ドラムMIDIエディタ
        </h1>
        <span className="text-[10px] text-zinc-500 ml-auto hidden sm:inline">
          スペース=再生/停止 | 左クリック=ノート追加/削除 | 右クリック=ベロシティ
          | Ctrl+Z=元に戻す
        </span>
      </div>

      {/* Transport */}
      <TransportBar
        isPlaying={isPlaying}
        bpm={state.bpm}
        loop={loop}
        canUndo={undoStack.current.length > 0}
        canRedo={redoStack.current.length > 0}
        onPlay={startPlayback}
        onStop={stopPlayback}
        onBpmChange={(bpm) => setState((p) => ({ ...p, bpm }))}
        onLoopToggle={() => setLoop((l) => !l)}
        onUpload={handleUpload}
        onDownload={handleDownload}
        onUndo={undoAndRender}
        onRedo={redoAndRender}
        measures={state.measures}
        onMeasuresChange={(m) => {
          pushUndoAndRender();
          setState((p) => ({ ...p, measures: m }));
        }}
      />

      {/* Grid */}
      <DrumGrid
        notes={state.notes}
        instruments={state.instruments}
        measures={state.measures}
        ticksPerBeat={state.ticksPerBeat}
        timeSignatureNumerator={state.timeSignatureNumerator}
        playheadTick={playheadTick}
        onToggleNote={handleToggleNote}
        onVelocityEdit={handleVelocityEdit}
      />

      {/* Velocity popup */}
      {velocityPopup && (
        <VelocitySlider
          velocity={velocityPopup.velocity}
          x={velocityPopup.x}
          y={velocityPopup.y}
          onChange={handleVelocityChange}
          onClose={handleVelocityClose}
        />
      )}

      {/* Drop overlay */}
      {isDragOver && (
        <div className="fixed inset-0 bg-amber-500/10 border-4 border-dashed border-amber-500/50 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-zinc-800 rounded-xl px-8 py-6 shadow-2xl text-center">
            <p className="text-lg font-bold text-amber-400">
              MIDIファイルをドロップ
            </p>
            <p className="text-sm text-zinc-400 mt-1">
              .mid / .midi ファイルに対応
            </p>
          </div>
        </div>
      )}

      {/* Empty state hint */}
      {state.notes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-center opacity-40">
            <p className="text-zinc-400 text-sm">
              グリッドをクリックしてノートを追加
            </p>
            <p className="text-zinc-500 text-xs mt-1">
              または MIDIファイルをドラッグ&ドロップ
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
