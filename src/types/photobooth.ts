export type FacingMode = "user" | "environment";

export type TimerDuration = 3 | 5 | 10;

export type SessionStatus = "idle" | "countdown" | "capturing" | "completed";

export interface PhotoboothLayout {
  id: string;
  name: string;
  poseCount: number;
  description: string;
  wireframeType: "strip-3" | "grid-4" | "strip-4" | "dual-2";
}

export interface CapturedPhoto {
  id: string;
  poseIndex: number;
  dataUrl: string;
  timestamp: number;
}

export const LAYOUT_OPTIONS: PhotoboothLayout[] = [
  {
    id: "3-pose-strip",
    name: "3-Pose Strip",
    poseCount: 3,
    description: "Classic 3-photo vertical strip",
    wireframeType: "strip-3",
  },
  {
    id: "4-pose-grid",
    name: "4-Pose Grid",
    poseCount: 4,
    description: "Modern 2x2 collage layout",
    wireframeType: "grid-4",
  },
  {
    id: "4-pose-strip",
    name: "4-Pose Strip",
    poseCount: 4,
    description: "Tall 4-photo vertical strip",
    wireframeType: "strip-4",
  },
  {
    id: "2-pose-dual",
    name: "2-Pose Dual",
    poseCount: 2,
    description: "Quick 2-photo wide memory",
    wireframeType: "dual-2",
  },
];
