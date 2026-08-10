"use client";

import React, { useState } from "react";
import CameraFeed from "@/components/CameraFeed";
import PrinterPreview from "@/components/PrinterPreview";
import {
  ArrowLeft,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";
import { PhotoboothLayout, LAYOUT_OPTIONS } from "@/types/photobooth";

export type PhotoboothStep = "start" | "layout" | "camera" | "preview";

export interface PhotoLayout {
  id: string;
  name: string;
  poseCount: number;
  description: string;
}

export const PHOTO_LAYOUTS: PhotoLayout[] = [
  {
    id: "2-pose-strip",
    name: "2-Pose Strip",
    poseCount: 2,
    description: "Quick 2-photo vertical strip",
  },
  {
    id: "3-pose-strip",
    name: "3-Pose Strip",
    poseCount: 3,
    description: "Classic 3-photo photobooth strip",
  },
  {
    id: "4-pose-strip",
    name: "4-Pose Strip",
    poseCount: 4,
    description: "Tall 4-photo story strip",
  },
];

export default function PhotoboothStateMachine() {
  const [currentStep, setCurrentStep] = useState<PhotoboothStep>("start");
  const [selectedLayout, setSelectedLayout] = useState<PhotoboothLayout>(LAYOUT_OPTIONS[0]);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);

  // Handle template selection
  const handleSelectLayout = (layout: PhotoLayout) => {
    const matched = LAYOUT_OPTIONS.find((l) => l.poseCount === layout.poseCount) || LAYOUT_OPTIONS[0];
    setSelectedLayout(matched);
    setCapturedImages([]);
    setCurrentStep("camera");
  };

  // Handoff Trigger: Called when user completes capture and clicks DONE
  const handleCameraComplete = (images: string[]) => {
    setCapturedImages(images);
    setCurrentStep("preview");
  };

  // Back button handler
  const handleBack = () => {
    if (currentStep === "preview") {
      setCurrentStep("camera");
    } else if (currentStep === "camera") {
      setCurrentStep("start");
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#cbd5e1] text-white flex flex-col items-center justify-center p-4 overflow-hidden selection:bg-orange-500/30">
      {/* Main Container Layer */}
      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center justify-center min-h-[85vh] p-4 sm:p-6 md:p-12 rounded-3xl bg-slate-800/90 border border-white/20 backdrop-blur-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)]">
        {/* Step Indicator Header */}
        {currentStep !== "start" && (
          <div className="w-full flex items-center justify-between mb-4 px-4 py-3 rounded-full bg-slate-700/80 border border-white/15 backdrop-blur-md transition-all duration-300">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
              {currentStep === "preview"
                ? "Back to Camera"
                : "Back to Home"}
            </button>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-400">
              <Sparkles className="w-4 h-4" />
              <span>
                {currentStep === "camera"
                  ? "Step 1 of 2"
                  : "Final Preview"}
              </span>
            </div>
          </div>
        )}

        {/* SCREEN 1: START SCREEN */}
        {currentStep === "start" && (
          <div className="w-full flex flex-col items-center justify-center text-center py-12 px-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-white text-sm font-semibold tracking-wide mb-6">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span>Digital Photobooth</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-4">
              Capture Your <span className="text-orange-500">Best Moments</span>
            </h1>
            <p className="font-serif italic text-gray-200 text-lg md:text-xl max-w-md mb-10 leading-relaxed font-normal">
              Step right up! Strike your best poses and create timeless photo strips.
            </p>

            <button
              onClick={() => setCurrentStep("camera")}
              className="group relative inline-flex items-center justify-center px-14 py-5 rounded-full bg-gradient-to-b from-orange-400 to-orange-600 border border-orange-300/40 text-white font-black text-xl md:text-2xl tracking-wider animate-breathing-shadow hover:scale-[1.02] active:scale-[0.98] transition-transform duration-300 cursor-pointer overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-t-full pointer-events-none" />
              <span className="relative z-10 font-black text-white">Capture</span>
            </button>
          </div>
        )}

        {/* SCREEN 2: CAMERA VIEW (Mounts CameraFeed component) */}
        {currentStep === "camera" && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
            <CameraFeed
              selectedLayout={selectedLayout}
              onSelectLayout={setSelectedLayout}
              onComplete={handleCameraComplete}
              onBack={handleBack}
            />
          </div>
        )}

        {/* SCREEN 3: PREVIEW STATE (Mounts PrinterPreview) */}
        {currentStep === "preview" && (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
            <PrinterPreview
              capturedImages={capturedImages}
              selectedLayout={selectedLayout}
              onRetake={() => {
                setCapturedImages([]);
                setCurrentStep("camera");
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
