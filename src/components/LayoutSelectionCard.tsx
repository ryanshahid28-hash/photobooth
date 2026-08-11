"use client";

import React from "react";
import { Image as ImageIcon, Sparkles } from "lucide-react";
import { PhotoLayout } from "./PhotoboothStateMachine";

interface LayoutSelectionCardProps {
  layout: PhotoLayout;
  isSelected?: boolean;
  onSelect: (layout: PhotoLayout) => void;
}

export default function LayoutSelectionCard({
  layout,
  isSelected = false,
  onSelect,
}: LayoutSelectionCardProps) {
  return (
    <div
      onClick={() => onSelect(layout)}
      className={`relative w-full bg-zinc-800 rounded-3xl p-6 border transition-all duration-300 flex flex-col items-center justify-between gap-5 cursor-pointer group shadow-xl ${
        isSelected
          ? "border-orange-500 ring-2 ring-orange-500/30 shadow-orange-500/20"
          : "border-zinc-700/70 hover:border-orange-500/50 hover:shadow-orange-500/10"
      }`}
    >
      {/* Top Title & Description - In normal document flow */}
      <div className="w-full flex flex-col items-center">
        <h3 className="text-3xl font-serif italic text-gray-200 drop-shadow-lg text-center mb-1">
          {layout.name}
        </h3>
        <p className="text-xs text-zinc-400 text-center font-medium">
          {layout.description}
        </p>
      </div>

      {/* Inner Wireframe Preview Box */}
      <div className="w-full max-w-[180px] bg-zinc-900/90 rounded-2xl p-3 border border-zinc-700/60 flex flex-col gap-2.5 items-center justify-center my-2 shadow-inner group-hover:border-orange-500/40 transition-colors">
        {Array.from({ length: layout.poseCount }).map((_, idx) => (
          <div
            key={idx}
            className="w-full aspect-[4/3] rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-500 group-hover:border-orange-500/30 group-hover:bg-zinc-800/90 transition-all"
          >
            <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-semibold">
              <ImageIcon className="w-3.5 h-3.5 text-orange-400/70 group-hover:text-orange-400 transition-colors" />
              <span>Pose #{idx + 1}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Select Template CTA Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(layout);
        }}
        className="w-full py-3 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold text-sm tracking-wide transition-all shadow-md shadow-orange-500/20 cursor-pointer flex items-center justify-center gap-2"
      >
        <Sparkles className="w-4 h-4 text-white" />
        <span>Select Template</span>
      </button>
    </div>
  );
}
