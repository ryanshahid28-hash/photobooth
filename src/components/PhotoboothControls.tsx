"use client";

import React from "react";
import { FacingMode, TimerDuration } from "@/types/photobooth";
import { Camera, Timer, CheckCircle, Video } from "lucide-react";

interface PhotoboothControlsProps {
  facingMode: FacingMode;
  onFacingModeChange: (mode: FacingMode) => void;
  timerDuration: TimerDuration;
  onTimerChange: (duration: TimerDuration) => void;
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  onDeviceSelect: (deviceId: string) => void;
  photosTaken: number;
  totalPoses: number;
  disabled?: boolean;
}

export default function PhotoboothControls({
  facingMode,
  onFacingModeChange,
  timerDuration,
  onTimerChange,
  devices,
  selectedDeviceId,
  onDeviceSelect,
  photosTaken,
  totalPoses,
  disabled = false,
}: PhotoboothControlsProps) {
  return (
    <div className="w-full flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-neutral-900/80 border border-white/10 backdrop-blur-md">
      {/* Dropdowns Row */}
      <div className="flex items-center flex-wrap gap-2.5">
        {/* Camera Selection Dropdown */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-medium focus-within:ring-2 focus-within:ring-indigo-500">
          <Camera className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
          {devices.length > 0 ? (
            <select
              value={selectedDeviceId}
              onChange={(e) => onDeviceSelect(e.target.value)}
              disabled={disabled}
              className="bg-transparent text-white text-xs outline-none cursor-pointer disabled:cursor-not-allowed max-w-[140px] sm:max-w-[180px] truncate"
            >
              {devices.map((device, idx) => (
                <option
                  key={device.deviceId || idx}
                  value={device.deviceId}
                  className="bg-neutral-900 text-white"
                >
                  {device.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={facingMode}
              onChange={(e) => onFacingModeChange(e.target.value as FacingMode)}
              disabled={disabled}
              className="bg-transparent text-white text-xs outline-none cursor-pointer disabled:cursor-not-allowed"
            >
              <option value="user" className="bg-neutral-900 text-white">
                Front Camera (User)
              </option>
              <option value="environment" className="bg-neutral-900 text-white">
                Rear Camera (Environment)
              </option>
            </select>
          )}
        </div>

        {/* Countdown Timer Selector Dropdown */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-medium focus-within:ring-2 focus-within:ring-indigo-500">
          <Timer className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="text-neutral-400 hidden sm:inline">Timer:</span>
          <select
            value={timerDuration}
            onChange={(e) => onTimerChange(Number(e.target.value) as TimerDuration)}
            disabled={disabled}
            className="bg-transparent text-white text-xs outline-none cursor-pointer disabled:cursor-not-allowed"
          >
            <option value={3} className="bg-neutral-900 text-white">
              3 Seconds
            </option>
            <option value={5} className="bg-neutral-900 text-white">
              5 Seconds
            </option>
            <option value={10} className="bg-neutral-900 text-white">
              10 Seconds
            </option>
          </select>
        </div>
      </div>

      {/* Photos Taken Progress Counter Badge */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold tracking-wide">
        <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
        <span>
          Photos: {photosTaken} / {totalPoses}
        </span>
      </div>
    </div>
  );
}
