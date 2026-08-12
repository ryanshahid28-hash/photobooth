"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Share2,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { PhotoboothLayout } from "@/types/photobooth";

interface PrinterPreviewProps {
  capturedImages: string[];
  selectedLayout?: PhotoboothLayout | { poseCount: number; name: string } | null;
  onRetake?: () => void;
  onDownloadDone?: () => void;
}

export default function PrinterPreview({
  capturedImages,
  selectedLayout,
  onRetake,
  onDownloadDone,
}: PrinterPreviewProps) {
  const [isPrinting, setIsPrinting] = useState<boolean>(true);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // Mechanical printing status state (2.5s timer)
  useEffect(() => {
    setIsPrinting(true);
    const timer = setTimeout(() => {
      setIsPrinting(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Generate Photo Strip Canvas
  const generatePhotoStripCanvas = useCallback(async (): Promise<HTMLCanvasElement | null> => {
    if (capturedImages.length === 0) return null;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const count = capturedImages.length;
    const canvasWidth = 600;
    const padding = 24;
    const photoWidth = canvasWidth - padding * 2;
    const targetAspectRatio = 3 / 4;
    const photoHeight = Math.round(photoWidth / targetAspectRatio);
    const footerHeight = 160;
    const canvasHeight = padding + count * (photoHeight + padding) + footerHeight;

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

    // Load background pattern and watermark logo assets concurrently before canvas rendering
    let bgPattern: HTMLImageElement | null = null;
    let logoImg: HTMLImageElement | null = null;
    try {
      const [bg, logo] = await Promise.all([
        loadImage("/assets/orange-waves.png").catch((err) => {
          console.error("Error loading background pattern:", err);
          return null;
        }),
        loadImage("/assets/little-arabia-logo.png").catch((err) => {
          console.error("Error loading watermark logo:", err);
          return null;
        }),
      ]);
      bgPattern = bg;
      logoImg = logo;
    } catch (err) {
      console.error("Error loading canvas assets:", err);
    }

    // Base Layer: Draw dynamic wavy background pattern across full canvas
    if (bgPattern) {
      ctx.drawImage(bgPattern, 0, 0, canvasWidth, canvasHeight);
    } else {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // Photo Layer: Stamp center-cropped photos over pattern with dark borders
    for (let i = 0; i < count; i++) {
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

        // Thin dark stroke to separate photos from the busy background pattern
        ctx.strokeStyle = "#111111";
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, photoWidth, photoHeight);
      } catch (err) {
        console.error("Error drawing photo onto canvas:", err);
      }
    }

    // Footer Layer Setup
    const footerY = canvasHeight - footerHeight;

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

    const footerText = `PHOTOBOOTH MEMORY • ${formattedDate}`;

    ctx.font = "bold 14px sans-serif";
    const textMetrics = ctx.measureText(footerText);
    const pillPaddingX = 24;
    const pillHeight = 38;
    const pillWidth = textMetrics.width + pillPaddingX * 2;
    const pillX = (canvasWidth - pillWidth) / 2;
    const pillY = canvasHeight - pillHeight - 20;
    const pillRadius = pillHeight / 2;

    // Brand Logo Layer: Centered horizontally, positioned directly above the date pill
    if (logoImg) {
      const logoWidth = 80;
      const logoHeight = 80;
      const logoX = (canvasWidth / 2) - (logoWidth / 2);
      const logoY = pillY - logoHeight - 10;
      ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
    }

    // Date Pill & Text Layer: Rendered on top of logo/background for crisp legibility
    ctx.fillStyle = "rgba(17, 17, 17, 0.75)";
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(pillX, pillY, pillWidth, pillHeight, pillRadius);
    } else {
      ctx.rect(pillX, pillY, pillWidth, pillHeight);
    }
    ctx.fill();

    // Legible white date text inside pill
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(footerText, canvasWidth / 2, pillY + pillHeight / 2);

    return canvas;
  }, [capturedImages]);

  useEffect(() => {
    generatePhotoStripCanvas().then((canvas) => {
      if (canvas) {
        setPreviewDataUrl(canvas.toDataURL("image/png"));
      }
    });
  }, [generatePhotoStripCanvas]);

  const handleDownloadPNG = async () => {
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
      if (onDownloadDone) onDownloadDone();
    } catch (err) {
      console.error("Failed to download photo strip:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    try {
      const canvas = await generatePhotoStripCanvas();
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

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center animate-in fade-in zoom-in-95 duration-300 my-4">
      {/* PRINTER HARDWARE (TOP CONTAINER - z-20) */}
      <div className="w-full bg-zinc-800 rounded-3xl p-4 sm:p-5 relative shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),inset_0_-3px_6px_rgba(0,0,0,0.6)] border border-zinc-700/50 z-20">
        <div className="flex items-center justify-between px-2">
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

        {/* Exit Slot */}
        <div className="w-full h-2.5 bg-zinc-950 rounded-full border border-black/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.9)] mt-4 overflow-hidden" />
      </div>

      {/* THE MASK CONTAINER (overflow-hidden, flush against exit slot -mt-2, z-10) */}
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
        {/* Download PNG */}
        <button
          type="button"
          onClick={handleDownloadPNG}
          disabled={isDownloading}
          className="bg-orange-500 hover:bg-orange-600 active:scale-98 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all w-full text-base disabled:opacity-50"
        >
          {isDownloading ? (
            <Loader2 className="w-5 h-5 animate-spin text-white" />
          ) : (
            <Download className="w-5 h-5 text-white" />
          )}
          <span>Download PNG</span>
        </button>

        {/* Share */}
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
        {onRetake && (
          <button
            type="button"
            onClick={onRetake}
            className="mt-2 text-xs font-semibold text-neutral-400 hover:text-white flex items-center justify-center gap-1.5 py-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Take new photos</span>
          </button>
        )}
      </div>
    </div>
  );
}
