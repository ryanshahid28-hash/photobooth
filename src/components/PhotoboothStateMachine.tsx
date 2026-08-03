"use client";

import React, { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import {
  Camera,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Image as ImageIcon,
  RotateCcw,
  Play,
  Download,
  FileImage,
} from "lucide-react";

export type PhotoboothStep = "start" | "layout" | "camera";

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
  const [selectedLayout, setSelectedLayout] = useState<PhotoLayout | null>(null);

  // Camera & Capture Loop States
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const targetPoses = selectedLayout?.poseCount || 3;

  // Handle template selection
  const handleSelectLayout = (layout: PhotoLayout) => {
    setSelectedLayout(layout);
    setCapturedImages([]);
    setIsCapturing(false);
    setCountdown(null);
    setCurrentStep("camera");
  };

  // Start Capture Button Handler
  const handleStartCapture = () => {
    setCapturedImages([]);
    setIsCapturing(true);
    setCountdown(3);
  };

  // Automated Interval Capture Loop
  useEffect(() => {
    if (!isCapturing) return;

    // Stop condition check
    if (capturedImages.length >= targetPoses) {
      setIsCapturing(false);
      setCountdown(null);
      return;
    }

    if (countdown === null) {
      setCountdown(3);
      return;
    }

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    }

    // At Countdown 0 -> Take Screenshot
    if (countdown === 0) {
      if (webcamRef.current) {
        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
          setCapturedImages((prev) => [...prev, imageSrc]);
          
          // Visual Flash Trigger
          setFlash(true);
          setTimeout(() => setFlash(false), 200);
        }
      }

      // Check if more photos are needed
      if (capturedImages.length + 1 < targetPoses) {
        setCountdown(3);
      } else {
        setIsCapturing(false);
        setCountdown(null);
      }
    }
  }, [isCapturing, countdown, capturedImages.length, targetPoses]);

  // Canvas Compositor: Draw Photo Strip
  const drawPhotoStrip = async (): Promise<HTMLCanvasElement | null> => {
    if (capturedImages.length === 0) return null;

    const canvas = canvasRef.current || document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const poseCount = capturedImages.length;
    const canvasWidth = 600;
    const padding = 24;
    const photoWidth = canvasWidth - padding * 2; // 552px
    const photoHeight = 414; // Maintains 4:3 ratio (552 / 1.333)
    const footerHeight = 130;
    const canvasHeight = padding + poseCount * (photoHeight + padding) + footerHeight;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Fill background with clean white
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Helper to load image asynchronously
    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = src;
      });
    };

    // Draw each captured photo in sequence
    for (let i = 0; i < poseCount; i++) {
      try {
        const img = await loadImage(capturedImages[i]);
        const x = padding;
        const y = padding + i * (photoHeight + padding);

        // Draw photo
        ctx.drawImage(img, x, y, photoWidth, photoHeight);

        // Draw subtle photo frame border
        ctx.strokeStyle = "#E5E5E5";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, photoWidth, photoHeight);
      } catch (err) {
        console.error("Error drawing photo onto canvas:", err);
      }
    }

    // Draw Footer Area
    const footerY = canvasHeight - footerHeight;

    // Decorative Accent Line
    ctx.strokeStyle = "#F43F5E"; // Rose 500
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(padding, footerY + 15);
    ctx.lineTo(canvasWidth - padding, footerY + 15);
    ctx.stroke();

    // Footer Text: "Your Shop Logo Here"
    ctx.fillStyle = "#111827"; // Dark Neutral
    ctx.font = "bold 26px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Your Shop Logo Here", canvasWidth / 2, footerY + 60);

    // Footer Date & Subtitle
    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }) + " • " + now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    ctx.fillStyle = "#6B7280"; // Neutral text
    ctx.font = "14px sans-serif";
    ctx.fillText(`PHOTOBOOTH MEMORY • ${formattedDate}`, canvasWidth / 2, footerY + 90);

    return canvas;
  };

  // Download Photo Strip Function
  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      const canvas = await drawPhotoStrip();
      if (!canvas) return;

      // Convert canvas to Data URL
      const dataUrl = canvas.toDataURL("image/png");

      // Programmatically create temporary <a> tag and trigger download
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `photobooth-strip-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download photo strip:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Back button handler
  const handleBack = () => {
    setIsCapturing(false);
    setCountdown(null);
    if (currentStep === "camera") {
      setCurrentStep("layout");
    } else if (currentStep === "layout") {
      setCurrentStep("start");
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-neutral-950 text-white flex flex-col items-center justify-center p-4 overflow-hidden selection:bg-rose-500/30">
      {/* Hidden HTML5 Canvas for Photo Strip Compositing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-pink-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center justify-center min-h-[85vh]">
        {/* Step Indicator Header (Visible in Layout & Camera steps) */}
        {currentStep !== "start" && (
          <div className="w-full flex items-center justify-between mb-6 px-4 py-3 rounded-full bg-neutral-900/60 border border-white/10 backdrop-blur-md transition-all duration-300">
            <button
              onClick={handleBack}
              disabled={isCapturing}
              className="flex items-center gap-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              {currentStep === "camera" ? "Back to Layouts" : "Back to Home"}
            </button>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-400">
              <Sparkles className="w-4 h-4" />
              <span>Step {currentStep === "layout" ? "1 of 2" : "2 of 2"}</span>
            </div>
          </div>
        )}

        {/* SCREEN 1: START SCREEN */}
        {currentStep === "start" && (
          <div className="w-full flex flex-col items-center justify-center text-center py-12 px-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Logo / Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-semibold tracking-wide mb-6">
              <Sparkles className="w-4 h-4" />
              <span>Digital Photobooth</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-4">
              Capture Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-500">Best Moments</span>
            </h1>
            <p className="text-neutral-400 text-base md:text-lg max-w-md mb-10 leading-relaxed">
              Step right up! Choose your custom layout, strike your best poses, and create timeless photo strips.
            </p>

            {/* Large Pill-Shaped Button */}
            <button
              onClick={() => setCurrentStep("layout")}
              className="group relative inline-flex items-center justify-center gap-3 px-10 py-5 rounded-full bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold text-lg md:text-xl shadow-[0_0_30px_rgba(244,63,94,0.4)] hover:shadow-[0_0_45px_rgba(244,63,94,0.65)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
            >
              <div className="p-2 rounded-full bg-white/20 text-white group-hover:rotate-12 transition-transform duration-300">
                <Camera className="w-6 h-6 fill-current" />
              </div>
              <span>Start the Booth</span>
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

            {/* 3 Clickable Layout Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
              {PHOTO_LAYOUTS.map((layout) => (
                <button
                  key={layout.id}
                  onClick={() => handleSelectLayout(layout)}
                  className="group relative flex flex-col items-center justify-between p-6 rounded-3xl bg-neutral-900/80 border border-white/10 hover:border-rose-500/50 hover:bg-neutral-900/90 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-500/10 cursor-pointer"
                >
                  {/* Card Visual Wireframe */}
                  <div className="w-full py-6 flex items-center justify-center bg-black/40 rounded-2xl border border-white/5 mb-4 group-hover:border-rose-500/30 transition-colors">
                    <div className="w-14 flex flex-col gap-1.5 p-2 rounded-lg bg-neutral-800 border border-neutral-700">
                      {Array.from({ length: layout.poseCount }).map((_, i) => (
                        <div
                          key={i}
                          className="h-7 w-full rounded bg-neutral-700/80 border border-neutral-600 flex items-center justify-center group-hover:bg-rose-950/40 group-hover:border-rose-500/40 transition-colors"
                        >
                          <ImageIcon className="w-3 h-3 text-neutral-400 group-hover:text-rose-400" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="text-center w-full">
                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-rose-400 transition-colors">
                      {layout.name}
                    </h3>
                    <p className="text-xs text-neutral-400 mb-4">
                      {layout.description}
                    </p>

                    <div className="w-full py-2.5 rounded-xl bg-white/5 group-hover:bg-rose-500 group-hover:text-white text-rose-300 font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-1.5">
                      <span>Select Template</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SCREEN 3: CAMERA FEED & AUTOMATED INTERVAL CAPTURE */}
        {currentStep === "camera" && (
          <div className="w-full flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header / Selected Layout Info */}
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Layout: {selectedLayout?.name} ({targetPoses} Poses)</span>
              </div>
            </div>

            {/* Webcam Feed Container */}
            <div className="relative w-full max-w-2xl aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl bg-neutral-900 border border-white/10 mb-6">
              {/* React Webcam Component */}
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "user" }}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  position: "absolute",
                  left: 0,
                  top: 0,
                }}
              />

              {/* Flash Overlay Effect */}
              {flash && (
                <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-200 pointer-events-none" />
              )}

              {/* Countdown Overlay on Center of Feed */}
              {isCapturing && countdown !== null && countdown > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] z-30 pointer-events-none">
                  <div className="text-8xl md:text-9xl font-black text-white drop-shadow-[0_4px_25px_rgba(244,63,94,0.9)] animate-pulse tracking-tight">
                    {countdown}
                  </div>
                  <div className="text-sm font-semibold tracking-wider text-rose-300 uppercase mt-3 px-4 py-1 rounded-full bg-black/60 border border-rose-500/30">
                    Pose {capturedImages.length + 1} of {targetPoses}
                  </div>
                </div>
              )}

              {/* Live Pose Counter Badge */}
              <div className="absolute top-4 left-4 z-20 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-semibold flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isCapturing ? "bg-rose-500 animate-ping" : "bg-emerald-400"}`} />
                <span>Poses: {capturedImages.length} / {targetPoses}</span>
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex items-center gap-4 mb-6">
              {/* Conditional Button: Start Capture vs Download Photo Strip */}
              {capturedImages.length < targetPoses ? (
                <button
                  onClick={handleStartCapture}
                  disabled={isCapturing}
                  className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold text-lg shadow-[0_0_25px_rgba(244,63,94,0.4)] hover:shadow-[0_0_35px_rgba(244,63,94,0.65)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isCapturing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Capturing Poses...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" />
                      <span>{capturedImages.length > 0 ? "Retake Photos" : "Start Capture"}</span>
                    </>
                  )}
                </button>
              ) : (
                /* Download Photo Strip Button (Replaces Start button when all poses captured) */
                <button
                  onClick={handleDownload}
                  disabled={isGenerating}
                  className="group relative inline-flex items-center justify-center gap-3 px-9 py-4 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white font-bold text-lg shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:shadow-[0_0_40px_rgba(16,185,129,0.65)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Generating Strip...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-6 h-6 animate-bounce" />
                      <span>Download Photo Strip</span>
                    </>
                  )}
                </button>
              )}

              {/* Retake Session Option when complete */}
              {capturedImages.length === targetPoses && (
                <button
                  onClick={handleStartCapture}
                  className="inline-flex items-center gap-2 px-5 py-4 rounded-full bg-neutral-900 border border-white/15 text-neutral-300 hover:text-white hover:bg-neutral-800 font-semibold text-sm transition-all duration-200 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retake</span>
                </button>
              )}

              {/* Back to Layouts Button */}
              <button
                onClick={handleBack}
                disabled={isCapturing}
                className="inline-flex items-center gap-2 px-6 py-4 rounded-full bg-neutral-900 border border-white/15 text-neutral-200 hover:text-white hover:bg-neutral-800 hover:border-white/30 font-semibold text-sm transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Layouts</span>
              </button>
            </div>

            {/* Thumbnail Previews Row */}
            <div className="w-full max-w-2xl bg-neutral-900/60 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center justify-between">
                <span>Captured Poses ({capturedImages.length}/{targetPoses})</span>
                {capturedImages.length === targetPoses && (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Ready to Download!
                  </span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: targetPoses }).map((_, idx) => {
                  const img = capturedImages[idx];
                  return (
                    <div
                      key={idx}
                      className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all duration-300 flex items-center justify-center ${
                        img
                          ? "border-rose-500 shadow-md shadow-rose-500/20 bg-black"
                          : "border-white/10 bg-black/40 border-dashed"
                      }`}
                    >
                      {img ? (
                        <img
                          src={img}
                          alt={`Pose ${idx + 1}`}
                          className="w-full h-full object-cover animate-in fade-in zoom-in-95 duration-200"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-neutral-600 gap-1">
                          <ImageIcon className="w-4 h-4 text-neutral-600" />
                          <span className="text-[10px] font-bold">Pose {idx + 1}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
