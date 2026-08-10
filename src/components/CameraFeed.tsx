"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Webcam from "react-webcam";
import LayoutSelector from "@/components/LayoutSelector";
import {
  FacingMode,
  TimerDuration,
  SessionStatus,
  PhotoboothLayout,
  CapturedPhoto,
  LAYOUT_OPTIONS,
} from "@/types/photobooth";
import {
  Play,
  RotateCcw,
  Camera,
  CheckCircle2,
  Sparkles,
  Loader2,
  CameraOff,
  Square,
  UploadCloud,
  Maximize2,
  Minimize2,
  Download,
} from "lucide-react";

export default function CameraFeed() {
  // State Manager
  const [selectedLayout, setSelectedLayout] = useState<PhotoboothLayout>(
    LAYOUT_OPTIONS[0]
  );
  const [facingMode, setFacingMode] = useState<FacingMode>("user");
  const [timerDuration, setTimerDuration] = useState<TimerDuration>(3);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  // Controls States
  const [isMirrored, setIsMirrored] = useState<boolean>(false);
  const [isFlashOn, setIsFlashOn] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Sequence & Countdown State
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("idle");
  const [currentCountdown, setCurrentCountdown] = useState<number | null>(null);
  const [currentPoseIndex, setCurrentPoseIndex] = useState<number>(0);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const webcamRef = useRef<Webcam>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Review state check: true when all poses are captured
  const isReviewState =
    capturedPhotos.length > 0 &&
    capturedPhotos.length === selectedLayout.poseCount;

  // Stable Memoized Video Constraints
  const videoConstraints = useMemo<MediaTrackConstraints>(() => {
    if (selectedDeviceId && selectedDeviceId.trim() !== "") {
      return {
        deviceId: selectedDeviceId,
        aspectRatio: 4 / 3,
        width: { ideal: 1280 },
        height: { ideal: 960 },
      };
    }
    return {
      facingMode: facingMode,
      aspectRatio: 4 / 3,
      width: { ideal: 1280 },
      height: { ideal: 960 },
    };
  }, [facingMode, selectedDeviceId]);

  // Callback when camera stream starts successfully
  const handleUserMedia = useCallback(() => {
    setIsCameraReady(true);
    setHasError(false);
    setErrorMessage("");

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

  const handleUserMediaError = useCallback((error: string | DOMException) => {
    console.error("Camera access error:", error);
    setIsCameraReady(false);
    setHasError(true);

    let msg = "Unable to access camera. Please check your browser permissions.";
    if (error instanceof DOMException) {
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        msg = "Camera permission was denied. Please allow access in your browser settings.";
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        msg = "No camera device detected.";
      } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        msg = "Your camera may be in use by another application.";
      }
    }
    setErrorMessage(msg);
  }, []);

  // Generate Photo Strip Composited Image for Review Preview & Download
  const generatePhotoStripCanvas = useCallback(async (): Promise<HTMLCanvasElement | null> => {
    if (capturedPhotos.length === 0) return null;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const poseCount = capturedPhotos.length;
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
        const img = await loadImage(capturedPhotos[i].dataUrl);
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
  }, [capturedPhotos]);

  // Update preview image data URL whenever capturedPhotos changes to review state
  useEffect(() => {
    if (isReviewState) {
      generatePhotoStripCanvas().then((canvas) => {
        if (canvas) {
          setPreviewDataUrl(canvas.toDataURL("image/png"));
        }
      });
    } else {
      setPreviewDataUrl(null);
    }
  }, [isReviewState, generatePhotoStripCanvas]);

  // Fullscreen Toggle Handler
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current
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
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (activeIntervalRef.current) clearInterval(activeIntervalRef.current);
      if (activeTimeoutRef.current) clearTimeout(activeTimeoutRef.current);
    };
  }, []);

  // Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          const poseIdx = capturedPhotos.length;
          const newPhoto: CapturedPhoto = {
            id: `upload-${Date.now()}-${poseIdx}`,
            poseIndex: poseIdx,
            dataUrl,
            timestamp: Date.now(),
          };
          setCapturedPhotos((prev) => [...prev, newPhoto]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Flash & Take Snapshot Logic
  const capturePhoto = (poseIndex: number) => {
    if (isFlashOn) {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 250);
    }

    const imageSrc = webcamRef.current?.getScreenshot();

    const newPhoto: CapturedPhoto = {
      id: `photo-${Date.now()}-${poseIndex}`,
      poseIndex,
      dataUrl: imageSrc || "",
      timestamp: Date.now(),
    };

    setCapturedPhotos((prev) => [...prev, newPhoto]);
  };

  // Start Interval Capture Sequence
  const startSequence = () => {
    setCapturedPhotos([]);
    setSessionStatus("countdown");
    runPoseCountdown(0);
  };

  const runPoseCountdown = (poseIndex: number) => {
    setCurrentPoseIndex(poseIndex);
    let timeLeft = timerDuration;
    setCurrentCountdown(timeLeft);

    if (activeIntervalRef.current) clearInterval(activeIntervalRef.current);

    activeIntervalRef.current = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft > 0) {
        setCurrentCountdown(timeLeft);
      } else {
        if (activeIntervalRef.current) clearInterval(activeIntervalRef.current);
        setCurrentCountdown(0);

        capturePhoto(poseIndex);

        const nextPose = poseIndex + 1;
        if (nextPose < selectedLayout.poseCount) {
          setSessionStatus("capturing");
          activeTimeoutRef.current = setTimeout(() => {
            setSessionStatus("countdown");
            runPoseCountdown(nextPose);
          }, 1500);
        } else {
          activeTimeoutRef.current = setTimeout(() => {
            setSessionStatus("completed");
            setCurrentCountdown(null);
          }, 500);
        }
      }
    }, 1000);
  };

  // Retake Action: Resets captured photos array to [] and returns to live camera feed
  const handleRetake = () => {
    if (activeIntervalRef.current) clearInterval(activeIntervalRef.current);
    if (activeTimeoutRef.current) clearTimeout(activeTimeoutRef.current);
    setCapturedPhotos([]);
    setSessionStatus("idle");
    setCurrentCountdown(null);
    setCurrentPoseIndex(0);
    setIsFlashing(false);
    setPreviewDataUrl(null);
  };

  // Download Handler for DONE button
  const handleDownloadDone = async () => {
    try {
      setIsDownloading(true);
      const canvas = await generatePhotoStripCanvas();
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
      setIsDownloading(false);
    }
  };

  const handleLayoutChange = (layout: PhotoboothLayout) => {
    setSelectedLayout(layout);
    handleRetake();
  };

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-white p-3 sm:p-6 flex flex-col items-center justify-between gap-4 max-w-5xl mx-auto selection:bg-orange-500/30">
      {/* Top Header & Layout Selector */}
      <header className="w-full flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
                Web Photobooth
              </h1>
              <p className="text-xs text-neutral-400 hidden sm:block">
                Select a layout, set the timer, and snap your photos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold">
              {isReviewState ? "Review Mode" : "Live Feed"}
            </span>
          </div>
        </div>

        {/* Wireframe Layout Selector */}
        <LayoutSelector
          selectedLayout={selectedLayout}
          onSelectLayout={handleLayoutChange}
          disabled={sessionStatus !== "idle" && sessionStatus !== "completed"}
        />
      </header>

      {/* Main Viewport Section */}
      <main className="w-full flex-1 flex flex-col items-center justify-center my-2">
        {/* TOP CONTROL BAR (Above Video Feed) */}
        <div className="w-full flex items-center justify-center gap-3 sm:gap-4 mb-4 flex-wrap z-10">
          {/* Camera Device Select */}
          <select
            value={selectedDeviceId || facingMode}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "user" || val === "environment") {
                setSelectedDeviceId("");
                setFacingMode(val as FacingMode);
              } else {
                setSelectedDeviceId(val);
              }
            }}
            disabled={sessionStatus !== "idle" && sessionStatus !== "completed"}
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

          {/* Upload Image Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sessionStatus !== "idle" && sessionStatus !== "completed"}
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

          {/* Timer Select */}
          <select
            value={timerDuration}
            onChange={(e) => setTimerDuration(Number(e.target.value) as TimerDuration)}
            disabled={sessionStatus !== "idle" && sessionStatus !== "completed"}
            className="bg-white text-slate-800 border border-slate-200 shadow-sm rounded-xl px-3.5 py-2 text-sm font-semibold outline-none hover:border-slate-300 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value={3}>3s</option>
            <option value={5}>5s</option>
            <option value={10}>10s</option>
          </select>
        </div>

        {/* RELATIVE VIEWPORT CONTAINER */}
        <div
          ref={containerRef}
          className="relative w-full max-w-3xl aspect-[4/3] bg-black overflow-hidden rounded-3xl border border-white/15 shadow-2xl flex items-center justify-center group"
        >
          {/* STATE TRIGGER: In Review State -> Unmount/Hide live <Webcam/> feed and render Photo Strip Preview */}
          {isReviewState ? (
            <div className="relative w-full h-full flex flex-col items-center justify-center p-4 bg-neutral-900 overflow-y-auto">
              {previewDataUrl ? (
                <div className="relative max-h-full flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300">
                  <img
                    src={previewDataUrl}
                    alt="Final Photo Strip Preview"
                    className="max-h-[75vh] object-contain rounded-xl shadow-2xl border border-white/20"
                  />
                  <div className="mt-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 text-xs font-semibold">
                    Photo Strip Review Preview
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-white gap-2">
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                  <p className="text-xs font-semibold">Compositing Photo Strip...</p>
                </div>
              )}
            </div>
          ) : (
            /* Live Camera Feed & Overlays */
            <>
              {/* White Flash Effect Overlay */}
              <div
                className={`absolute inset-0 bg-white z-40 pointer-events-none transition-opacity duration-150 ${
                  isFlashing ? "opacity-100" : "opacity-0"
                }`}
              />

              {/* Webcam Component */}
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={videoConstraints}
                onUserMedia={handleUserMedia}
                onUserMediaError={handleUserMediaError}
                mirrored={isMirrored}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />

              {/* Loading Overlay */}
              {!isCameraReady && !hasError && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-6 text-center">
                  <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-3" />
                  <p className="text-sm font-semibold text-white">Initializing Camera...</p>
                </div>
              )}

              {/* Error Overlay */}
              {hasError && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 p-6 text-center">
                  <CameraOff className="w-12 h-12 text-red-400 mb-3" />
                  <h3 className="text-base font-bold text-white mb-1">Camera Unavailable</h3>
                  <p className="text-xs text-neutral-400 max-w-xs mb-4">{errorMessage}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200"
                  >
                    Reload Page
                  </button>
                </div>
              )}

              {/* Visual Countdown Overlay */}
              {sessionStatus === "countdown" && currentCountdown !== null && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/30 backdrop-blur-[2px]">
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-36 h-36 rounded-full bg-orange-500/30 animate-ping" />
                    <div className="w-28 h-28 rounded-full bg-black/60 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl">
                      <span className="text-6xl font-black text-white tracking-tighter animate-pulse">
                        {currentCountdown}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 px-4 py-1.5 rounded-full bg-black/60 border border-white/10 text-xs font-semibold text-orange-400">
                    Get ready for Pose #{currentPoseIndex + 1}!
                  </div>
                </div>
              )}

              {/* Pause Between Poses Overlay */}
              {sessionStatus === "capturing" && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                  <div className="px-5 py-2.5 rounded-2xl bg-orange-500 text-white font-bold text-sm tracking-wide shadow-xl animate-bounce flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Pose #{currentPoseIndex + 1} Captured! Next coming up...</span>
                  </div>
                </div>
              )}
            </>
          )}

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

        {/* BOTTOM CONTROL BAR */}
        {isReviewState ? (
          /* CONTROL BAR SWAP: REVIEW STATE BUTTONS */
          <div className="w-full flex items-center justify-center gap-3 sm:gap-4 my-4 flex-wrap animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Mirror: Outlined style */}
            <button
              type="button"
              onClick={() => setIsMirrored((prev) => !prev)}
              className="border border-orange-500 text-orange-500 hover:bg-orange-500/10 font-bold rounded-full px-6 py-3 transition-all cursor-pointer text-sm tracking-wide active:scale-95"
            >
              <span>Mirror: {isMirrored ? "On" : "Off"}</span>
            </button>

            {/* Retake: Solid fill (Resets capturedPhotos to [] & returns UI to live camera feed) */}
            <button
              type="button"
              onClick={handleRetake}
              className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold rounded-full px-6 py-3 transition-all cursor-pointer shadow-lg shadow-orange-500/20 text-sm tracking-wide flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake</span>
            </button>

            {/* DONE: Outlined style (Hooked up to Canvas download function) */}
            <button
              type="button"
              onClick={handleDownloadDone}
              disabled={isDownloading}
              className="border border-orange-500 text-orange-500 hover:bg-orange-500/10 font-bold rounded-full px-6 py-3 transition-all cursor-pointer text-sm tracking-wide flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>DONE</span>
            </button>

            {/* Flash: Solid fill */}
            <button
              type="button"
              onClick={() => setIsFlashOn((prev) => !prev)}
              className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold rounded-full px-6 py-3 transition-all cursor-pointer shadow-lg shadow-orange-500/20 text-sm tracking-wide"
            >
              <span>Flash: {isFlashOn ? "On" : "Off"}</span>
            </button>
          </div>
        ) : (
          /* STANDARD LIVE CAMERA CONTROL BAR */
          <div className="w-full flex items-center justify-center gap-3 sm:gap-4 my-4 flex-wrap">
            {/* Mirror Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMirrored((prev) => !prev)}
              className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold rounded-full px-6 py-3 shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm tracking-wide"
            >
              <span>Mirror: {isMirrored ? "On" : "Off"}</span>
            </button>

            {/* Start Button */}
            <button
              type="button"
              onClick={startSequence}
              disabled={
                !isCameraReady ||
                hasError ||
                sessionStatus === "countdown" ||
                sessionStatus === "capturing"
              }
              className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold rounded-full px-8 py-3 shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="w-4 h-4" />
              <span>START</span>
            </button>

            {/* Flash Toggle Button */}
            <button
              type="button"
              onClick={() => setIsFlashOn((prev) => !prev)}
              className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold rounded-full px-6 py-3 shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm tracking-wide"
            >
              <span>Flash: {isFlashOn ? "On" : "Off"}</span>
            </button>
          </div>
        )}
      </main>

      {/* Thumbnail Preview Strip */}
      <div className="w-full max-w-3xl mx-auto flex items-center justify-center gap-2 sm:gap-3 overflow-x-auto py-1">
        {Array.from({ length: selectedLayout.poseCount }).map((_, idx) => {
          const captured = capturedPhotos.find((p) => p.poseIndex === idx);

          return (
            <div
              key={idx}
              className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 overflow-hidden flex-shrink-0 flex items-center justify-center bg-neutral-900 transition-all ${
                captured
                  ? "border-orange-500 shadow-md shadow-orange-500/20"
                  : idx === currentPoseIndex && sessionStatus === "countdown"
                  ? "border-orange-500 animate-pulse"
                  : "border-white/10"
              }`}
            >
              {captured ? (
                <img
                  src={captured.dataUrl}
                  alt={`Pose ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-1">
                  <span className="text-[10px] font-bold text-neutral-500 block">
                    Pose #{idx + 1}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
