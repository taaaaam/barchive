"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

interface CameraPhoto {
  url: string;
  sourceType: "post" | "memory";
  sourceTitle: string;
  sourceId?: string;
}

interface CameraViewerProps {
  photos: CameraPhoto[];
  index: number;
  loading: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

// Photo of a Canon IXUS 70 (public domain, Wikimedia Commons: "Canon Ixus 70 back.jpg"
// by David Gerard), cut out, de-branded and perspective-corrected so the LCD is a
// 4:3 rectangle. Positions below are percentages of the 1512x1051 image.
const CAMERA_IMAGE = "/assets/digicam.webp";
const CAMERA_ASPECT = "1512 / 1051";
const LCD = { left: "10.25%", top: "31.02%", width: "58.2%", height: "62.8%" };
// Left/right edges of the control dial, used as the previous/next buttons
const DIAL_LEFT = { left: "74.5%", top: "60%", width: "5.5%", height: "12%" };
const DIAL_RIGHT = { left: "91.5%", top: "60%", width: "5.5%", height: "12%" };
// How many photos to keep loaded ahead of / behind the current one
const PRELOAD_AHEAD = 5;
const PRELOAD_BEHIND = 2;

export default function CameraViewer({
  photos,
  index,
  loading,
  onPrevious,
  onNext,
}: CameraViewerProps) {
  // `index` is the photo that was asked for; `shownIndex` is the one on screen.
  // We only switch (and flash) once the requested photo has finished loading,
  // so the flash and the new photo always appear together.
  const [shownIndex, setShownIndex] = useState<number | null>(null);
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(new Set());
  const [flashKey, setFlashKey] = useState(0);
  const canFlip = !loading && photos.length > 1;
  const requested = photos[index];
  const shown = shownIndex !== null ? photos[shownIndex] : undefined;

  useEffect(() => {
    if (!requested || shownIndex === index || !loadedUrls.has(requested.url)) {
      return;
    }
    if (shownIndex !== null) setFlashKey((k) => k + 1);
    setShownIndex(index);
  }, [index, requested, shownIndex, loadedUrls]);

  const markLoaded = (url: string) =>
    setLoadedUrls((prev) => (prev.has(url) ? prev : new Set(prev).add(url)));

  // Keep the shown photo, the requested one, and several photos either side
  // mounted (hidden), so flipping through them is already loaded.
  const photoAt = (offset: number) =>
    photos[(((index + offset) % photos.length) + photos.length) % photos.length]
      ?.url;
  const nearby =
    photos.length > 1
      ? [
          ...Array.from({ length: PRELOAD_AHEAD }, (_, i) => photoAt(i + 1)),
          ...Array.from({ length: PRELOAD_BEHIND }, (_, i) => photoAt(-(i + 1))),
        ]
      : [];
  const layerUrls = Array.from(
    new Set(
      [shown?.url, requested?.url, ...nearby].filter(
        (url): url is string => !!url
      )
    )
  );

  const previous = () => {
    if (canFlip) onPrevious();
  };
  const next = () => {
    if (canFlip) onNext();
  };

  // Arrow keys flip through photos, unless the user is typing somewhere
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        target instanceof Element &&
        target.closest("input, textarea, select, [contenteditable]")
      ) {
        return;
      }
      if (e.key === "ArrowLeft") previous();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  return (
    <div className="w-full max-w-[min(56rem,calc((100vh-260px)*1.44))] mx-auto">
      <div className="relative w-full" style={{ aspectRatio: CAMERA_ASPECT }}>
        <Image
          src={CAMERA_IMAGE}
          alt=""
          fill
          priority
          sizes="(min-width: 896px) 896px, 100vw"
          className="select-none pointer-events-none drop-shadow-2xl"
        />

        {/* LCD screen */}
        <div
          className="absolute bg-black overflow-hidden font-mono text-[8px] sm:text-[10px] md:text-xs uppercase tracking-wider text-white/90"
          style={LCD}
        >
          {!loading && requested?.url ? (
            <button
              type="button"
              onClick={next}
              aria-label="Next photo"
              className="absolute inset-0 w-full h-full cursor-pointer"
            >
              {layerUrls.map((url) => (
                <Image
                  key={url}
                  src={url}
                  alt={url === shown?.url ? `Photo from ${shown.sourceTitle}` : ""}
                  fill
                  sizes="(min-width: 896px) 520px, 58vw"
                  loading="eager"
                  fetchPriority={url === requested.url ? "high" : "low"}
                  // next/image only fires onLoad once the image is decoded,
                  // so a loaded layer can be swapped in without a paint delay
                  onLoad={() => markLoaded(url)}
                  onError={() => markLoaded(url)}
                  className={`object-contain ${
                    url === shown?.url ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}

              {/* Shutter flash, timed with the photo swap */}
              {flashKey > 0 && (
                <span
                  key={flashKey}
                  className="camera-flash absolute inset-0 bg-white pointer-events-none"
                />
              )}

              {!shown && <ReadingCard />}

              {/* Playback HUD */}
              {shown && shownIndex !== null && (
                <span className="absolute inset-0 p-[3%] flex flex-col justify-between text-left pointer-events-none [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">
                  <span className="flex justify-between items-center">
                    <span>▶ 100-{String(shownIndex + 1).padStart(4, "0")}</span>
                    <BatteryIcon />
                  </span>
                  <span className="flex justify-between items-end gap-4">
                    <span className="truncate normal-case tracking-normal">
                      {shown.sourceType === "post" ? "Post" : "Memory"}:{" "}
                      {shown.sourceTitle}
                    </span>
                    <span className="flex-shrink-0">
                      {shownIndex + 1}/{photos.length}
                    </span>
                  </span>
                </span>
              )}
            </button>
          ) : loading ? (
            <ReadingCard />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              No image
            </div>
          )}
        </div>

        {/* Control dial: left/right flip photos */}
        <button
          type="button"
          onClick={previous}
          disabled={!canFlip}
          aria-label="Previous photo"
          className="absolute rounded-full hover:bg-white/25 active:bg-white/40 transition-colors disabled:cursor-default"
          style={DIAL_LEFT}
        />
        <button
          type="button"
          onClick={next}
          disabled={!canFlip}
          aria-label="Next photo"
          className="absolute rounded-full hover:bg-white/25 active:bg-white/40 transition-colors disabled:cursor-default"
          style={DIAL_RIGHT}
        />
      </div>
      {canFlip && (
        <p className="mt-3 text-center text-white/60 text-xs">
          Click the screen or use ◀ ▶ to flip through photos
        </p>
      )}
    </div>
  );
}

function ReadingCard() {
  return (
    <span className="absolute inset-0 flex items-center justify-center animate-pulse">
      Reading card…
    </span>
  );
}

function BatteryIcon() {
  return (
    <svg
      className="w-[1.8em] h-[0.9em]"
      viewBox="0 0 22 11"
      fill="none"
      aria-hidden="true"
    >
      <rect x="0.75" y="0.75" width="18" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="19.5" y="3.5" width="2" height="4" rx="0.5" fill="currentColor" />
      <rect x="3" y="3" width="4" height="5" fill="currentColor" />
      <rect x="8" y="3" width="4" height="5" fill="currentColor" />
      <rect x="13" y="3" width="4" height="5" fill="currentColor" />
    </svg>
  );
}
