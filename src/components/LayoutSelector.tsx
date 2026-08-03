"use client";

import React from "react";
import { LAYOUT_OPTIONS, PhotoboothLayout } from "@/types/photobooth";
import { LayoutGrid, Sparkles } from "lucide-react";

interface LayoutSelectorProps {
  selectedLayout: PhotoboothLayout;
  onSelectLayout: (layout: PhotoboothLayout) => void;
  disabled?: boolean;
}

export default function LayoutSelector({
  selectedLayout,
  onSelectLayout,
  disabled = false,
}: LayoutSelectorProps) {
  const renderWireframe = (type: PhotoboothLayout["wireframeType"]) => {
    switch (type) {
      case "strip-3":
        return (
          <div className="w-8 h-12 border border-current/40 rounded p-1 flex flex-col gap-1 justify-between bg-black/30">
            <div className="flex-1 rounded-sm border border-current/30 bg-current/10" />
            <div className="flex-1 rounded-sm border border-current/30 bg-current/10" />
            <div className="flex-1 rounded-sm border border-current/30 bg-current/10" />
          </div>
        );
      case "grid-4":
        return (
          <div className="w-10 h-10 border border-current/40 rounded p-1 grid grid-cols-2 gap-1 bg-black/30">
            <div className="rounded-sm border border-current/30 bg-current/10" />
            <div className="rounded-sm border border-current/30 bg-current/10" />
            <div className="rounded-sm border border-current/30 bg-current/10" />
            <div className="rounded-sm border border-current/30 bg-current/10" />
          </div>
        );
      case "strip-4":
        return (
          <div className="w-7 h-12 border border-current/40 rounded p-1 flex flex-col gap-0.5 justify-between bg-black/30">
            <div className="flex-1 rounded-sm border border-current/30 bg-current/10" />
            <div className="flex-1 rounded-sm border border-current/30 bg-current/10" />
            <div className="flex-1 rounded-sm border border-current/30 bg-current/10" />
            <div className="flex-1 rounded-sm border border-current/30 bg-current/10" />
          </div>
        );
      case "dual-2":
        return (
          <div className="w-12 h-9 border border-current/40 rounded p-1 grid grid-cols-2 gap-1 bg-black/30">
            <div className="rounded-sm border border-current/30 bg-current/10" />
            <div className="rounded-sm border border-current/30 bg-current/10" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
        <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
        <span>Select Photo Strip Layout</span>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
        {LAYOUT_OPTIONS.map((layout) => {
          const isSelected = layout.id === selectedLayout.id;

          return (
            <button
              key={layout.id}
              onClick={() => !disabled && onSelectLayout(layout)}
              disabled={disabled}
              className={`snap-start flex-shrink-0 flex items-center gap-3 px-3.5 py-2.5 rounded-2xl border transition-all duration-200 text-left ${
                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95"
              } ${
                isSelected
                  ? "bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                  : "bg-neutral-900/60 hover:bg-neutral-800/80 border-white/10 text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {/* Wireframe Preview */}
              <div
                className={`transition-colors ${
                  isSelected ? "text-indigo-400" : "text-neutral-500"
                }`}
              >
                {renderWireframe(layout.wireframeType)}
              </div>

              {/* Layout Details */}
              <div className="pr-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold tracking-tight text-white">
                    {layout.name}
                  </span>
                  {isSelected && (
                    <Sparkles className="w-3 h-3 text-indigo-400 animate-pulse" />
                  )}
                </div>
                <span className="text-[11px] block text-neutral-400">
                  {layout.poseCount} Poses
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
