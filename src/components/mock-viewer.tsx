"use client";

import { useState, useRef, useEffect } from "react";
import { RotateCcw, Compass } from "lucide-react";

interface MockViewerProps {
  modelName?: string;
}

export function MockViewer({ modelName = "BIM_Model_V1.ifc" }: MockViewerProps) {
  const [rotate, setRotate] = useState({ x: -20, y: 35 });
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [activeLayer, setActiveLayer] = useState("all");
  const dragRef = useRef<HTMLDivElement>(null);
  const prevMouseCoords = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    prevMouseCoords.current = { x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - prevMouseCoords.current.x;
      const deltaY = e.clientY - prevMouseCoords.current.y;

      setRotate((prev) => ({
        x: Math.max(-80, Math.min(80, prev.x - deltaY * 0.5)),
        y: prev.y + deltaX * 0.5,
      }));

      prevMouseCoords.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const resetView = () => {
    setRotate({ x: -20, y: 35 });
    setZoom(1);
  };

  return (
    <div className="w-full h-full relative bg-zinc-950/70 border border-white/5 rounded-2xl overflow-hidden flex flex-col justify-between group shadow-2xl">
      {/* Top Overlay Stats */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-1 pointer-events-none">
        <span className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          WebGL Active
        </span>
        <h4 className="text-sm font-bold text-white tracking-wide truncate max-w-[200px]">{modelName}</h4>
        <span className="text-[10px] text-zinc-500 font-mono">
          Rot: X: {rotate.x.toFixed(0)}° Y: {rotate.y.toFixed(0)}° | Zoom: {zoom.toFixed(1)}x
        </span>
      </div>

      {/* Top Right Actions */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <button
          onClick={resetView}
          className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
          className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-zinc-400 hover:text-white font-mono text-xs font-bold leading-none w-8 h-8 flex items-center justify-center"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.6, z - 0.1))}
          className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-zinc-400 hover:text-white font-mono text-xs font-bold leading-none w-8 h-8 flex items-center justify-center"
          title="Zoom Out"
        >
          -
        </button>
      </div>

      {/* Main Drag Sandbox */}
      <div
        ref={dragRef}
        onMouseDown={handleMouseDown}
        className={`flex-1 flex items-center justify-center cursor-grab active:cursor-grabbing relative overflow-hidden h-[320px] select-none`}
      >
        {/* Coordinate grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_60%,transparent_100%)] pointer-events-none" />

        {/* 3D Model Sandbox */}
        <div
          className="relative transition-transform duration-100 ease-out"
          style={{
            transform: `scale(${zoom})`,
            perspective: "800px",
          }}
        >
          <div
            className="w-48 h-48 relative transition-transform duration-75 ease-out"
            style={{
              transformStyle: "preserve-3d",
              transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
            }}
          >
            {/* Ground Grid Gridlines */}
            <div
              className="absolute w-[300px] h-[300px] border border-white/5 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:16px_16px]"
              style={{
                transform: "rotateX(90deg) translate3d(-50px, -50px, -80px)",
                transformStyle: "preserve-3d",
              }}
            />

            {/* Inner structural mock components (Building Columns / Glass panes) */}
            {/* Outer Box (Glass facade) */}
            <div
              className={`absolute w-36 h-44 border border-primary/20 bg-primary/5 backdrop-blur-[1px] transition-opacity duration-300 ${
                activeLayer === "structure" ? "opacity-10" : "opacity-40"
              }`}
              style={{ transform: "translate3d(12px, 8px, 20px)", transformStyle: "preserve-3d" }}
            >
              {/* Box faces */}
              <div className="absolute inset-0 border border-primary/25 bg-primary/5" style={{ transform: "translateZ(36px)" }} />
              <div className="absolute inset-0 border border-primary/25 bg-primary/5" style={{ transform: "rotateY(90deg) translateZ(18px) translateX(-18px)" }} />
              <div className="absolute inset-0 border border-primary/25 bg-primary/5" style={{ transform: "rotateY(180deg) translateZ(36px)" }} />
              <div className="absolute inset-0 border border-primary/25 bg-primary/5" style={{ transform: "rotateY(-90deg) translateZ(18px) translateX(18px)" }} />
              <div className="absolute inset-x-0 h-36 border border-primary/25 bg-primary/5" style={{ transform: "rotateX(90deg) translateZ(18px) translateY(-18px)" }} />
            </div>

            {/* Core Structural Columns (Neon Blue Lines inside) */}
            <div
              className="absolute w-28 h-40 border-2 border-dashed border-blue-500/30 flex flex-col justify-between p-2"
              style={{ transform: "translate3d(28px, 16px, 20px)", transformStyle: "preserve-3d" }}
            >
              {/* Columns */}
              <div className="w-1.5 h-full bg-blue-400/60 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              <div className="absolute right-2 top-2 bottom-2 w-1.5 bg-blue-400/60 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ transform: "translateZ(20px)" }} />
              <div className="absolute left-2 top-2 bottom-2 w-1.5 bg-blue-400/60 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ transform: "translateZ(-20px)" }} />
              <div className="absolute right-2 top-2 bottom-2 w-1.5 bg-blue-400/60 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ transform: "translateZ(-20px)" }} />

              {/* Concrete Floors */}
              <div className="absolute inset-x-0 h-2 bg-zinc-700/80 border border-zinc-600" style={{ transform: "translateY(12px) translateZ(10px)" }} />
              <div className="absolute inset-x-0 h-2 bg-zinc-700/80 border border-zinc-600" style={{ transform: "translateY(56px) translateZ(10px)" }} />
              <div className="absolute inset-x-0 h-2 bg-zinc-700/80 border border-zinc-600" style={{ transform: "translateY(100px) translateZ(10px)" }} />
              <div className="absolute inset-x-0 h-2 bg-zinc-700/80 border border-zinc-600" style={{ transform: "translateY(144px) translateZ(10px)" }} />
            </div>

            {/* Model Axis labels */}
            <div className="absolute -left-10 top-1/2 w-8 h-[2px] bg-red-500 font-mono text-[9px] text-red-400" style={{ transform: "rotateY(90deg)" }}>X</div>
            <div className="absolute left-1/2 -top-10 w-[2px] h-8 bg-green-500 font-mono text-[9px] text-green-400">Y</div>
            <div className="absolute left-1/2 top-1/2 w-8 h-[2px] bg-blue-500 font-mono text-[9px] text-blue-400" style={{ transform: "rotateX(90deg)" }}>Z</div>
          </div>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="p-4 bg-white/5 border-t border-white/5 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-zinc-500" />
          <span className="text-xs font-semibold text-zinc-400">Orbit Mode</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveLayer("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              activeLayer === "all"
                ? "bg-primary/20 border-primary/40 text-primary"
                : "bg-white/5 border-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            All Layers
          </button>
          <button
            onClick={() => setActiveLayer("structure")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              activeLayer === "structure"
                ? "bg-primary/20 border-primary/40 text-primary"
                : "bg-white/5 border-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            Structure
          </button>
        </div>
      </div>
    </div>
  );
}
