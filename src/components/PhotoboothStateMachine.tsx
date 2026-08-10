"use client";

import React, { useState, useRef } from "react";
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

  // Handoff Trigger: Called when camera capture completes or user clicks DONE
  const handleCameraComplete = (images: string[]) => {
    setCapturedImages(images);
    setCurrentStep("preview");
  };

  // Back button handler
  const handleBack = () => {
    if (currentStep === "preview") {
      setCurrentStep("camera");
    } else if (currentStep === "camera") {
      setCurrentStep("layout");
    } else if (currentStep === "layout") {
      setCurrentStep("start");
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#e2e8f0] text-white flex flex-col items-center justify-center p-4 overflow-hidden selection:bg-orange-500/30">
      {/* Background Ambient Logos */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <img
          src="/logo.png"
          alt=""
          className="absolute top-[6%] left-[4%] w-48 md:w-60 opacity-15 blur-[4px] -rotate-12 select-none"
        />
        <img
          src="/logo.png"
          alt=""
          className="absolute top-[12%] right-[6%] w-64 md:w-80 opacity-20 blur-[6px] rotate-45 select-none"
        />
        <img
          src="/logo.png"
          alt=""
          className="absolute bottom-[10%] left-[8%] w-56 md:w-72 opacity-10 blur-[8px] -rotate-45 select-none"
        />
        <img
          src="/logo.png"
          alt=""
          className="absolute bottom-[18%] right-[10%] w-52 md:w-64 opacity-15 blur-[3px] rotate-12 select-none"
        />
      </div>

      {/* Main Container Layer */}
      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center justify-center min-h-[85vh] p-4 sm:p-6 md:p-12 rounded-3xl bg-neutral-950/65 border border-white/20 backdrop-blur-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)]">
        {/* Step Indicator Header */}
        {currentStep !== "start" && (
          <div className="w-full flex items-center justify-between mb-4 px-4 py-3 rounded-full bg-neutral-900/70 border border-white/15 backdrop-blur-md transition-all duration-300">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
              {currentStep === "preview"
                ? "Back to Camera"
                : currentStep === "camera"
                ? "Back to Layouts"
                : "Back to Home"}
            </button>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-400">
              <Sparkles className="w-4 h-4" />
              <span>
                {currentStep === "layout"
                  ? "Step 1 of 3"
                  : currentStep === "camera"
                  ? "Step 2 of 3"
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
              Step right up! Choose your custom layout, strike your best poses, and create timeless photo strips.
            </p>

            <button
              onClick={() => setCurrentStep("layout")}
              className="group relative inline-flex items-center justify-center px-14 py-5 rounded-full bg-gradient-to-b from-orange-400 to-orange-600 border border-orange-300/40 text-white font-black text-xl md:text-2xl tracking-wider animate-breathing-shadow hover:scale-[1.02] active:scale-[0.98] transition-transform duration-300 cursor-pointer overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-t-full pointer-events-none" />
              <span className="relative z-10 font-black text-white">Capture</span>
            </button>
          </div>
        )}

        {/* SCREEN 2: LAYOUT SELECTION SCREEN */}
        {currentStep === "layout" && (
          <div className="w-full flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">
              Choose your layout
            </h2>
            <p className="text-neutral-400 text-sm md:text-base max-w-md mb-8">
              Select the number of poses for your photo strip template to begin your photo session.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
              {PHOTO_LAYOUTS.map((layout) => (
                <button
                  key={layout.id}
                  onClick={() => handleSelectLayout(layout)}
                  className="group relative flex flex-col items-center justify-between p-6 rounded-3xl bg-neutral-900/80 border border-white/10 hover:border-orange-500 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] hover:bg-neutral-900/90 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                >
                  <div className="w-full py-6 flex items-center justify-center bg-black/40 rounded-2xl border border-white/5 mb-4 group-hover:border-orange-500/30 transition-colors">
                    <div className="w-14 flex flex-col gap-1.5 p-2 rounded-lg bg-neutral-800 border border-neutral-700">
                      {Array.from({ length: layout.poseCount }).map((_, i) => (
                        <div
                          key={i}
                          className="h-7 w-full rounded bg-neutral-700/80 border border-neutral-600 flex items-center justify-center group-hover:bg-orange-950/40 group-hover:border-orange-500/50 transition-colors"
                        >
                          <ImageIcon className="w-3 h-3 text-neutral-400 group-hover:text-orange-400" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-center w-full">
                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-orange-500 transition-colors">
                      {layout.name}
                    </h3>
                    <p className="text-xs text-neutral-400 mb-4">
                      {layout.description}
                    </p>

                    <div className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20">
                      <span>Select Template</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SCREEN 3: CAMERA VIEW (Mounts CameraFeed component) */}
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

        {/* SCREEN 4: PREVIEW STATE (Unmounts CameraFeed & mounts PrinterPreview with Framer Motion rollout) */}
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
