"use client";

import { useEffect, useRef } from "react";

interface VelocitySliderProps {
  velocity: number;
  x: number;
  y: number;
  onChange: (velocity: number) => void;
  onClose: () => void;
}

export default function VelocitySlider({
  velocity,
  x,
  y,
  onChange,
  onClose,
}: VelocitySliderProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Clamp position to viewport
  const style: React.CSSProperties = {
    position: "fixed",
    left: Math.min(x, window.innerWidth - 200),
    top: Math.min(y, window.innerHeight - 80),
    zIndex: 100,
  };

  return (
    <div
      ref={ref}
      style={style}
      className="bg-zinc-800 rounded-lg shadow-xl border border-zinc-600 p-3 w-48"
    >
      <div className="text-xs text-zinc-400 mb-1">
        ベロシティ: {velocity}
      </div>
      <input
        type="range"
        min={1}
        max={127}
        value={velocity}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-amber-500"
      />
      <div className="flex justify-between text-[10px] text-zinc-500 mt-0.5">
        <span>弱</span>
        <span>強</span>
      </div>
    </div>
  );
}
