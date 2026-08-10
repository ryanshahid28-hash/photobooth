"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import { motion } from "framer-motion";
import {
  Camera,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Image as ImageIcon,
  RotateCcw,
  Play,
  Download,
  UploadCloud,
  Maximize2,
  Minimize2,
  Loader2,
  Share2,
  Film,
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

  // Camera & Controls States
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flash, setFlash] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Controls & Settings States
  const [isMirrored, setIsMirrored] = useState<boolean>(false);
  const [isFlashOn, setIsFlashOn] = useState<boolean>(false);
  const [timerDuration, setTimerDuration] = useState<number>(3);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // Mechanical printing status state (true during 2.5s rollout)
  const [isPrinting, setIsPrinting] = useState<boolean>(true);

  const targetPoses = selectedLayout?.poseCount || 3;

  // Review State Check: True when all poses are captured
  const isReviewState =
    capturedImages.length > 0 && capturedImages.length === targetPoses;

  // Handle printing timer feedback state
  useEffect(() => {
    if (isReviewState) {
      setIsPrinting(true);
      const timer = setTimeout(() => {
        setIsPrinting(false);
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      setIsPrinting(true);
    }
  }, [isReviewState]);

  // Enumerate video devices
  const handleUserMedia = useCallback(() => {
    if (typeof window !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((allDevices) => {
          const videoInputs = allDevices.filter(
            (d) => d.kind === "videoinput" && d.deviceId !== ""
          );
          setDevices(videoInputs);
        })
        .catch((err) => console.warn("Device enumeration error:", err));
    }
  }, []);

  // Handle template selection
  const handleSelectLayout = (layout: PhotoLayout) => {
    setSelectedLayout(layout);
    setCapturedImages([]);
    setIsCapturing(false);
    setCountdown(null);
    setPreviewDataUrl(null);
    setCurrentStep("camera");
  };

  // Start Capture Button Handler
  const handleStartCapture = () => {
    setCapturedImages([]);
    setPreviewDataUrl(null);
    setIsCapturing(true);
    setCountdown(timerDuration);
  };

  // Retake Action: Resets capturedImages to [] and returns to live feed UI
  const handleRetake = () => {
    setCapturedImages([]);
    setIsCapturing(false);
    setCountdown(null);
    setPreviewDataUrl(null);
  };

  // Toggle Fullscreen Handler
  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => console.error("Fullscreen error:", err));
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch((err) => console.error("Exit fullscreen error:", err));
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          setCapturedImages((prev) => [...prev, dataUrl]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Automated Interval Capture Loop
  useEffect(() => {
    if (!isCapturing) return;

    if (capturedImages.length >= targetPoses) {
      setIsCapturing(false);
      setCountdown(null);
      return;
    }

    if (countdown === null) {
      setCountdown(timerDuration);
      return;
    }

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (countdown === 0) {
      if (webcamRef.current) {
        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
          setCapturedImages((prev) => [...prev, imageSrc]);

          if (isFlashOn || flash) {
            setFlash(true);
            setTimeout(() => setFlash(false), 200);
          }
        }
      }

      if (capturedImages.length + 1 < targetPoses) {
        setCountdown(timerDuration);
      } else {
        setIsCapturing(false);
        setCountdown(null);
      }
    }
  }, [isCapturing, countdown, capturedImages.length, targetPoses, timerDuration, isFlashOn, flash]);

  // Canvas Compositor: Draw Photo Strip
  const drawPhotoStrip = useCallback(async (): Promise<HTMLCanvasElement | null> => {
    if (capturedImages.length === 0) return null;

    const canvas = canvasRef.current || document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const poseCount = capturedImages.length;
    const canvasWidth = 600;
    const padding = 24;
    const photoWidth = canvasWidth - padding * 2;
    const targetAspectRatio = 3 / 4;
    const photoHeight = Math.round(photoWidth / targetAspectRatio);
    const footerHeight = 130;
    const canvasHeight = padding + poseCount * (photoHeight + padding) + footerHeight;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = src;
      });
    };

    for (let i = 0; i < poseCount; i++) {
      try {
        const img = await loadImage(capturedImages[i]);
        const x = padding;
        const y = padding + i * (photoHeight + padding);

        const imgWidth = img.naturalWidth || img.width;
        const imgHeight = img.naturalHeight || img.height;
        const imgAspect = imgWidth / imgHeight;

        let sx = 0;
        let sy = 0;
        let sWidth = imgWidth;
        let sHeight = imgHeight;

        if (imgAspect > targetAspectRatio) {
          sWidth = imgHeight * targetAspectRatio;
          sHeight = imgHeight;
          sx = (imgWidth - sWidth) / 2;
          sy = 0;
        } else if (imgAspect < targetAspectRatio) {
          sWidth = imgWidth;
          sHeight = imgWidth / targetAspectRatio;
          sx = 0;
          sy = (imgHeight - sHeight) / 2;
        }

        ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, photoWidth, photoHeight);

        ctx.strokeStyle = "#E5E5E5";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, photoWidth, photoHeight);
      } catch (err) {
        console.error("Error drawing photo onto canvas:", err);
      }
    }

    const footerY = canvasHeight - footerHeight;

    ctx.strokeStyle = "#F97316";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(padding, footerY + 15);
    ctx.lineTo(canvasWidth - padding, footerY + 15);
    ctx.stroke();

    ctx.fillStyle = "#111827";
    ctx.font = "bold 26px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Your Shop Logo Here", canvasWidth / 2, footerY + 60);

    const now = new Date();
    const formattedDate =
      now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }) +
      " • " +
      now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

    ctx.fillStyle = "#6B7280";
    ctx.font = "14px sans-serif";
    ctx.fillText(`PHOTOBOOTH MEMORY • ${formattedDate}`, canvasWidth / 2, footerY + 90);

    return canvas;
  }, [capturedImages]);

  // Update Review Preview Image Data URL
  useEffect(() => {
    if (isReviewState) {
      drawPhotoStrip().then((canvas) => {
        if (canvas) {
          setPreviewDataUrl(canvas.toDataURL("image/png"));
        }
      });
    } else {
      setPreviewDataUrl(null);
    }
  }, [isReviewState, drawPhotoStrip]);

  // Download Photo Strip Function (Download PNG button action)
  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      const canvas = await drawPhotoStrip();
      if (!canvas) return;

      const dataUrl = canvas.toDataURL("image/png");

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

  // Share Handler
  const handleShare = async () => {
    try {
      const canvas = await drawPhotoStrip();
      if (!canvas) return;

      const dataUrl = canvas.toDataURL("image/png");

      if (navigator.share) {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], "photobooth-strip.png", { type: "image/png" });
        await navigator.share({
          title: "My Photobooth Memory",
          text: "Check out my photo strip!",
          files: [file],
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShareFeedback("Link copied to clipboard!");
        setTimeout(() => setShareFeedback(null), 3000);
      }
    } catch (err) {
      console.warn("Share operation cancelled or unsupported:", err);
    }
  };

  // Back button handler
  const handleBack = () => {
    setIsCapturing(false);
    setCountdown(null);
    setPreviewDataUrl(null);
    if (currentStep === "camera") {
      setCurrentStep("layout");
    } else if (currentStep === "layout") {
      setCurrentStep("start");
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#e2e8f0] text-white flex flex-col items-center justify-center p-4 overflow-hidden selection:bg-orange-500/30">
      {/* Hidden Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Container Layer */}
      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center justify-center min-h-[85vh] p-6 md:p-12 rounded-3xl bg-neutral-950/65 border border-white/20 backdrop-blur-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)]">
        {/* Step Indicator Header */}
        {currentStep !== "start" && (
          <div className="w-full flex items-center justify-between mb-6 px-4 py-3 rounded-full bg-neutral-900/70 border border-white/15 backdrop-blur-md transition-all duration-300">
            <button
              onClick={handleBack}
              disabled={isCapturing}
              className="flex items-center gap-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors px-3 py-1.5 rounded-full hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              {currentStep === "camera" ? "Back to Layouts" : "Back to Home"}
            </button>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-400">
              <Sparkles className="w-4 h-4" />
              <span>Step {currentStep === "layout" ? "1 of 2" : "2 of 2"}</span>
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

        {/* SCREEN 3: CAMERA VIEW / REVIEW STATE */}
        {currentStep === "camera" && (
          <div className="w-full flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header Info */}
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-500 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                <span>
                  {isReviewState
                    ? "Review State: Photo Strip Preview"
                    : `Layout: ${selectedLayout?.name} (${targetPoses} Poses)`}
                </span>
              </div>
            </div>

            {/* TOP CONTROL BAR (Visible during live feed) */}
            {!isReviewState && (
              <div className="w-full flex items-center justify-center gap-3 sm:gap-4 mb-4 flex-wrap z-10">
                <select
                  value={selectedDeviceId || facingMode}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "user" || val === "environment") {
                      setSelectedDeviceId("");
                      setFacingMode(val as "user" | "environment");
                    } else {
                      setSelectedDeviceId(val);
                    }
                  }}
                  disabled={isCapturing}
                  className="bg-white text-slate-800 border border-slate-200 shadow-sm rounded-xl px-3.5 py-2 text-sm font-semibold outline-none hover:border-slate-300 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {devices.length > 0 ? (
                    devices.map((device, idx) => (
                      <option key={device.deviceId || idx} value={device.deviceId}>
                        {device.label || `Camera ${idx + 1}`}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="user">User Facing</option>
                      <option value="environment">Rear Facing</option>
                    </>
                  )}
                </select>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCapturing}
                  className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-sm rounded-xl px-3.5 py-2 text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UploadCloud className="w-4 h-4 text-slate-700" />
                  <span>Upload Image</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <select
                  value={timerDuration}
                  onChange={(e) => setTimerDuration(Number(e.target.value))}
                  disabled={isCapturing}
                  className="bg-white text-slate-800 border border-slate-200 shadow-sm rounded-xl px-3.5 py-2 text-sm font-semibold outline-none hover:border-slate-300 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value={3}>3s</option>
                  <option value={5}>5s</option>
                  <option value={10}>10s</option>
                </select>
              </div>
            )}

            {/* REVIEW STATE: PRINTER HARDWARE & FRAMER MOTION ROLLOUT ANIMATION */}
            {isReviewState ? (
              <div className="w-full max-w-md mx-auto flex flex-col items-center animate-in fade-in zoom-in-95 duration-300 my-4">
                {/* PRINTER HARDWARE (TOP CONTAINER - z-20) */}
                <div className="w-full bg-zinc-800 rounded-3xl p-4 sm:p-5 relative shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),inset_0_-3px_6px_rgba(0,0,0,0.6)] border border-zinc-700/50 z-20">
                  <div className="flex items-center justify-between px-2">
                    {/* Dynamic Printer Feedback: Printing... with blinking green LED vs Ready ✦ with static yellow LED */}
                    <span className="text-white font-serif italic text-sm sm:text-base tracking-wide flex items-center gap-1.5">
                      {isPrinting ? "Printing..." : "Ready ✦"}
                    </span>

                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isPrinting
                          ? "bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]"
                          : "bg-yellow-400 shadow-[0_0_8px_#facc15]"
                      }`}
                    />
                  </div>

                  {/* Exit Slot: Dark horizontal div at bottom of printer hardware */}
                  <div className="w-full h-2.5 bg-zinc-950 rounded-full border border-black/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.9)] mt-4 overflow-hidden" />
                </div>

                {/* THE MASK CONTAINER (overflow-hidden, flush against exit slot bottom -mt-2, z-10) */}
                <div className="relative z-10 -mt-2 bg-amber-950/80 p-3 sm:p-4 rounded-b-2xl shadow-2xl border border-amber-900/40 flex flex-col items-center justify-center max-w-sm w-full overflow-hidden transition-all">
                  {previewDataUrl ? (
                    <motion.div
                      key={previewDataUrl}
                      initial={{ y: "-100%", filter: "blur(8px)" }}
                      animate={{ y: "0%", filter: "blur(0px)" }}
                      transition={{ duration: 2.5, ease: "easeOut" }}
                      className="w-full flex justify-center"
                    >
                      <img
                        src={previewDataUrl}
                        alt="Printed Photo Strip"
                        className="max-h-[55vh] object-contain rounded-lg shadow-xl border border-white/20"
                      />
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-white py-12 gap-2">
                      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                      <p className="text-xs font-semibold">Printing Photo Strip...</p>
                    </div>
                  )}
                </div>

                {/* TYPOGRAPHY BELOW PHOTO STRIP */}
                <div className="mt-6 text-center">
                  <p className="font-serif italic text-orange-500 text-sm sm:text-base tracking-wide mb-1">
                    a moment, kept ✦
                  </p>
                  <h2 className="font-serif italic text-orange-500 text-2xl sm:text-3xl font-bold tracking-tight">
                    Ready to share ✦
                  </h2>
                </div>

                {/* ACTION BUTTONS (VERTICAL FLEX STACK) */}
                <div className="flex flex-col gap-3 w-full max-w-xs sm:max-w-sm mx-auto mt-6">
                  {/* 1. Download PNG: Solid orange fill */}
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={isGenerating}
                    className="bg-orange-500 hover:bg-orange-600 active:scale-98 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all w-full text-base disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                    ) : (
                      <Download className="w-5 h-5 text-white" />
                    )}
                    <span>Download PNG</span>
                  </button>

                  {/* 2. Save GIF & Save Video: Side-by-side flex row */}
                  <div className="flex items-center gap-3 w-full">
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="bg-white hover:bg-slate-100 active:scale-98 text-gray-800 font-bold py-3 px-4 rounded-xl shadow-sm border border-slate-200 flex-1 flex items-center justify-center gap-2 cursor-pointer transition-all text-sm"
                    >
                      <FileImage className="w-4 h-4 text-orange-500" />
                      <span>Save GIF</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownload}
                      className="bg-white hover:bg-slate-100 active:scale-98 text-gray-800 font-bold py-3 px-4 rounded-xl shadow-sm border border-slate-200 flex-1 flex items-center justify-center gap-2 cursor-pointer transition-all text-sm"
                    >
                      <Film className="w-4 h-4 text-orange-500" />
                      <span>Save Video</span>
                    </button>
                  </div>

                  {/* 3. Share: Full width, dark gray fill */}
                  <button
                    type="button"
                    onClick={handleShare}
                    className="bg-zinc-900 hover:bg-zinc-800 active:scale-98 text-white font-bold py-3.5 px-6 rounded-2xl shadow-md border border-white/10 flex items-center justify-center gap-2 cursor-pointer transition-all w-full text-sm sm:text-base"
                  >
                    <Share2 className="w-4 h-4 text-white" />
                    <span>Share</span>
                  </button>

                  {shareFeedback && (
                    <p className="text-xs text-orange-400 text-center font-semibold animate-pulse">
                      {shareFeedback}
                    </p>
                  )}

                  {/* Retake Session Option */}
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="mt-2 text-xs font-semibold text-neutral-400 hover:text-white flex items-center justify-center gap-1.5 py-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Take new photos</span>
                  </button>
                </div>
              </div>
            ) : (
              /* LIVE VIEWPORT CONTAINER */
              <div
                ref={videoContainerRef}
                className="relative w-full max-w-md aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl bg-neutral-900 border border-white/10 mb-4 group"
              >
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={
                    selectedDeviceId
                      ? { deviceId: selectedDeviceId, aspectRatio: 3 / 4 }
                      : { facingMode, aspectRatio: 3 / 4 }
                  }
                  onUserMedia={handleUserMedia}
                  mirrored={isMirrored}
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
                    <div className="text-8xl md:text-9xl font-black text-white drop-shadow-[0_4px_25px_rgba(249,115,22,0.9)] animate-pulse tracking-tight">
                      {countdown}
                    </div>
                    <div className="text-sm font-semibold tracking-wider text-orange-400 uppercase mt-3 px-4 py-1 rounded-full bg-black/60 border border-orange-500/50">
                      Pose {capturedImages.length + 1} of {targetPoses}
                    </div>
                  </div>
                )}

                {/* Live Pose Counter Badge */}
                <div className="absolute top-4 left-4 z-20 px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-semibold flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isCapturing ? "bg-orange-500 animate-ping" : "bg-emerald-400"}`} />
                  <span>Poses: {capturedImages.length} / {targetPoses}</span>
                </div>

                {/* FLOATING FULLSCREEN OVERLAY BUTTON (Bottom Right Corner) */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  title="Toggle Fullscreen"
                  className="absolute bottom-4 right-4 z-20 bg-white hover:bg-slate-100 text-slate-800 rounded-xl px-3 py-2 text-xs font-bold shadow-md hover:shadow-lg flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 border border-slate-100"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4 text-slate-800" />
                  ) : (
                    <Maximize2 className="w-4 h-4 text-slate-800" />
                  )}
                  <span>Fullscreen</span>
                </button>
              </div>
            )}

            {/* STANDARD LIVE CAMERA CONTROL BAR */}
            {!isReviewState && (
              <div className="w-full flex items-center justify-center gap-3 sm:gap-4 my-4 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsMirrored((prev) => !prev)}
                  className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold rounded-full px-6 py-3 shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm tracking-wide"
                >
                  <span>Mirror: {isMirrored ? "On" : "Off"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartCapture}
                  disabled={isCapturing}
                  className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold rounded-full px-8 py-3 shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCapturing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Capturing...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      <span>START</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsFlashOn((prev) => !prev)}
                  className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold rounded-full px-6 py-3 shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm tracking-wide"
                >
                  <span>Flash: {isFlashOn ? "On" : "Off"}</span>
                </button>
              </div>
            )}

            {/* Thumbnail Previews Row (Only during live mode) */}
            {!isReviewState && (
              <div className="w-full max-w-2xl bg-neutral-900/60 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 flex items-center justify-between">
                  <span>Captured Poses ({capturedImages.length}/{targetPoses})</span>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {Array.from({ length: targetPoses }).map((_, idx) => {
                    const img = capturedImages[idx];
                    return (
                      <div
                        key={idx}
                        className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all duration-300 flex items-center justify-center ${
                          img
                            ? "border-orange-500 shadow-md shadow-orange-500/20 bg-black"
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
