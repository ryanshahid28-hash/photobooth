"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Webcam from "react-webcam";
import LayoutSelector from "@/components/LayoutSelector";
import PhotoboothControls from "@/components/PhotoboothControls";
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

  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Sequence & Countdown State
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("idle");
  const [currentCountdown, setCurrentCountdown] = useState<number | null>(null);
  const [currentPoseIndex, setCurrentPoseIndex] = useState<number>(0);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);

  const webcamRef = useRef<Webcam>(null);
  const activeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stable Memoized Video Constraints
  const videoConstraints = useMemo<MediaTrackConstraints>(() => {
    if (selectedDeviceId && selectedDeviceId.trim() !== "") {
      return {
        deviceId: selectedDeviceId,
        aspectRatio: 3 / 4,
        width: { ideal: 1280 },
        height: { ideal: 720 },
      };
    }
    return {
      facingMode: facingMode,
      aspectRatio: 3 / 4,
      width: { ideal: 1280 },
      height: { ideal: 720 },
    };
  }, [facingMode, selectedDeviceId]);

  // Callback when camera stream starts successfully
  const handleUserMedia = useCallback(() => {
    setIsCameraReady(true);
    setHasError(false);
    setErrorMessage("");

    // Enumerate video devices AFTER permission is granted
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

  // Handle switching facing mode
  const handleFacingModeChange = (mode: FacingMode) => {
    setSelectedDeviceId("");
    setFacingMode(mode);
  };

  // Handle selecting a specific device ID
  const handleDeviceSelect = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (activeIntervalRef.current) clearInterval(activeIntervalRef.current);
      if (activeTimeoutRef.current) clearTimeout(activeTimeoutRef.current);
    };
  }, []);

  // Flash & Take Snapshot Logic
  const capturePhoto = (poseIndex: number) => {
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 250);

    const imageSrc = webcamRef.current?.getScreenshot();
    console.log(
      `📸 FLASH! Photo taken for pose #${poseIndex + 1}`,
      imageSrc ? "[Captured]" : "[Simulated]"
    );

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

  // Reset Session
  const resetSession = () => {
    if (activeIntervalRef.current) clearInterval(activeIntervalRef.current);
    if (activeTimeoutRef.current) clearTimeout(activeTimeoutRef.current);
    setSessionStatus("idle");
    setCapturedPhotos([]);
    setCurrentCountdown(null);
    setCurrentPoseIndex(0);
    setIsFlashing(false);
  };

  const handleLayoutChange = (layout: PhotoboothLayout) => {
    setSelectedLayout(layout);
    resetSession();
  };

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-white p-3 sm:p-6 flex flex-col justify-between gap-4 max-w-5xl mx-auto selection:bg-indigo-500/30">
      {/* Top Header & Layout Selector */}
      <header className="w-full flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
                Web Photobooth
              </h1>
              <p className="text-xs text-neutral-400 hidden sm:block">
                Select a layout, set the countdown timer, and snap your photos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-300 text-xs font-medium">
              Local-First
            </span>
          </div>
        </div>

        {/* Wireframe Layout Selector */}
        <LayoutSelector
          selectedLayout={selectedLayout}
          onSelectLayout={handleLayoutChange}
          disabled={sessionStatus !== "idle" && sessionStatus !== "completed"}
        />

        {/* Dropdown Controls Bar */}
        <PhotoboothControls
          facingMode={facingMode}
          onFacingModeChange={handleFacingModeChange}
          timerDuration={timerDuration}
          onTimerChange={setTimerDuration}
          devices={devices}
          selectedDeviceId={selectedDeviceId}
          onDeviceSelect={handleDeviceSelect}
          photosTaken={capturedPhotos.length}
          totalPoses={selectedLayout.poseCount}
          disabled={sessionStatus !== "idle" && sessionStatus !== "completed"}
        />
      </header>

      {/* Main Camera Feed Viewport Container */}
      <main className="w-full flex-1 flex items-center justify-center my-2">
        <div className="relative w-full aspect-[4/3] max-w-3xl bg-black overflow-hidden rounded-xl border border-white/15 shadow-2xl flex items-center justify-center">
          {/* White Flash Effect Overlay */}
          <div
            className={`absolute inset-0 bg-white z-40 pointer-events-none transition-opacity duration-150 ${
              isFlashing ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Camera Stream */}
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            onUserMedia={handleUserMedia}
            onUserMediaError={handleUserMediaError}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            className={`transition-transform duration-300 ${
              facingMode === "user" && !selectedDeviceId ? "scale-x-[-1]" : "scale-x-1"
            }`}
          />

          {/* Loading Overlay */}
          {!isCameraReady && !hasError && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-6 text-center">
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-3" />
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
                <div className="absolute w-36 h-36 rounded-full bg-indigo-500/30 animate-ping" />
                <div className="w-28 h-28 rounded-full bg-black/60 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl">
                  <span className="text-6xl font-black text-white tracking-tighter animate-pulse">
                    {currentCountdown}
                  </span>
                </div>
              </div>
              <div className="mt-4 px-4 py-1.5 rounded-full bg-black/60 border border-white/10 text-xs font-semibold text-amber-300">
                Get ready for Pose #{currentPoseIndex + 1}!
              </div>
            </div>
          )}

          {/* Pause Between Poses Overlay */}
          {sessionStatus === "capturing" && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <div className="px-5 py-2.5 rounded-2xl bg-indigo-600 text-white font-bold text-sm tracking-wide shadow-xl animate-bounce flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Pose #{currentPoseIndex + 1} Captured! Next coming up...</span>
              </div>
            </div>
          )}

          {/* Completion Overlay Banner */}
          {sessionStatus === "completed" && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-5 py-2 rounded-full bg-emerald-500/90 text-white font-bold text-xs shadow-xl backdrop-blur-md flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>All {selectedLayout.poseCount} Poses Captured!</span>
            </div>
          )}
        </div>
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
                  ? "border-emerald-500 shadow-md shadow-emerald-500/10"
                  : idx === currentPoseIndex && sessionStatus === "countdown"
                  ? "border-indigo-500 animate-pulse"
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

      {/* Control Action Buttons Row Below Camera */}
      <footer className="w-full max-w-3xl mx-auto flex items-center justify-center gap-4 py-2">
        {sessionStatus === "idle" && (
          <button
            onClick={startSequence}
            disabled={!isCameraReady || hasError}
            className="flex-1 max-w-xs flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-sm tracking-wide shadow-xl shadow-indigo-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Start Session</span>
          </button>
        )}

        {(sessionStatus === "countdown" || sessionStatus === "capturing") && (
          <button
            onClick={resetSession}
            className="flex-1 max-w-xs flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-sm tracking-wide shadow-xl shadow-red-600/20 transition-all"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>Cancel Sequence</span>
          </button>
        )}

        {sessionStatus === "completed" && (
          <div className="flex items-center gap-3 w-full max-w-md justify-center">
            <button
              onClick={resetSession}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-white font-semibold text-sm border border-white/10 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake Photos</span>
            </button>

            <button
              onClick={startSequence}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-sm transition-all shadow-lg"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start New Session</span>
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}
