"use client";

import { useRef } from "react";

interface TransportBarProps {
  isPlaying: boolean;
  bpm: number;
  loop: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onPlay: () => void;
  onStop: () => void;
  onBpmChange: (bpm: number) => void;
  onLoopToggle: () => void;
  onUpload: (file: File) => void;
  onDownload: () => void;
  onUndo: () => void;
  onRedo: () => void;
  measures: number;
  onMeasuresChange: (m: number) => void;
}

export default function TransportBar({
  isPlaying,
  bpm,
  loop,
  canUndo,
  canRedo,
  onPlay,
  onStop,
  onBpmChange,
  onLoopToggle,
  onUpload,
  onDownload,
  onUndo,
  onRedo,
  measures,
  onMeasuresChange,
}: TransportBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-wrap items-center gap-2 bg-zinc-800 border-b border-zinc-700 px-4 py-2 text-sm">
      {/* Play / Stop */}
      <button
        onClick={isPlaying ? onStop : onPlay}
        className={`px-3 py-1.5 rounded font-bold text-xs ${
          isPlaying
            ? "bg-red-600 hover:bg-red-700 text-white"
            : "bg-green-600 hover:bg-green-700 text-white"
        }`}
      >
        {isPlaying ? "Stop" : "Play"}
      </button>

      {/* BPM */}
      <div className="flex items-center gap-1 text-zinc-300">
        <span className="text-xs text-zinc-400">BPM:</span>
        <input
          type="number"
          min={30}
          max={300}
          value={bpm}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v >= 30 && v <= 300) onBpmChange(v);
          }}
          className="w-14 bg-zinc-700 border border-zinc-600 rounded px-1.5 py-0.5 text-xs text-center text-zinc-200 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Measures */}
      <div className="flex items-center gap-1 text-zinc-300">
        <span className="text-xs text-zinc-400">小節:</span>
        <input
          type="number"
          min={1}
          max={64}
          value={measures}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v >= 1 && v <= 64) onMeasuresChange(v);
          }}
          className="w-12 bg-zinc-700 border border-zinc-600 rounded px-1.5 py-0.5 text-xs text-center text-zinc-200 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Loop */}
      <button
        onClick={onLoopToggle}
        className={`px-2.5 py-1.5 rounded text-xs font-medium border ${
          loop
            ? "bg-amber-600 border-amber-500 text-white"
            : "bg-zinc-700 border-zinc-600 text-zinc-400 hover:text-zinc-200"
        }`}
      >
        Loop
      </button>

      <div className="w-px h-5 bg-zinc-600 mx-1" />

      {/* Undo / Redo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="px-2.5 py-1.5 rounded text-xs bg-zinc-700 border border-zinc-600 text-zinc-300 hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Undo
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="px-2.5 py-1.5 rounded text-xs bg-zinc-700 border border-zinc-600 text-zinc-300 hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Redo
      </button>

      <div className="w-px h-5 bg-zinc-600 mx-1" />

      {/* Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".mid,.midi"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="px-2.5 py-1.5 rounded text-xs bg-zinc-700 border border-zinc-600 text-zinc-300 hover:bg-zinc-600"
      >
        MIDI読込
      </button>

      {/* Download */}
      <button
        onClick={onDownload}
        className="px-2.5 py-1.5 rounded text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium"
      >
        MIDIダウンロード
      </button>
    </div>
  );
}
