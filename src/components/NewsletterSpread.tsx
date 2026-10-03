"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export interface SpreadNewsletter {
  id: string;
  title: string;
  pdfUrl: string;
  issueDate: string;
  canDelete: boolean;
}

interface NewsletterSpreadProps {
  newsletters: SpreadNewsletter[]; // already sorted oldest -> newest
  deletingId: string | null;
  onDelete: (newsletter: SpreadNewsletter) => void;
}

// Every cover is shown at magazine (US letter) proportions; other shapes are cropped to fit
const COVER_RATIO = 11 / 8.5;
const MAX_TILT = 18; // degrees at the outer edges of the fan
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

// First page of the PDF as an image, via Cloudinary
export function coverUrl(pdfUrl: string, width = 600): string {
  const t = `f_jpg,pg_1,w_${width},q_auto`;
  if (pdfUrl.includes("/raw/upload/")) {
    return pdfUrl.replace("/raw/upload/", `/image/upload/${t}/`);
  }
  return pdfUrl.replace("/upload/", `/upload/${t}/`);
}

const formatDate = (dateString: string) =>
  new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export default function NewsletterSpread({
  newsletters,
  deletingId,
  onDelete,
}: NewsletterSpreadProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  // Leaving a cover clears it after a short grace period, so the mouse can
  // travel down to the caption's buttons (or onto another cover) first
  const clearTimer = useRef<number | undefined>(undefined);
  const [dealt, setDealt] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const lastPointer = useRef<string>("mouse");

  const hoverOn = (i: number) => {
    window.clearTimeout(clearTimer.current);
    setHovered(i);
  };
  const keepHover = () => window.clearTimeout(clearTimer.current);
  const hoverOff = () => {
    window.clearTimeout(clearTimer.current);
    clearTimer.current = window.setTimeout(() => setHovered(null), 300);
  };
  useEffect(() => () => window.clearTimeout(clearTimer.current), []);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width)
    );
    observer.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  // Deal the covers out from a stack once we know the layout
  useEffect(() => {
    if (!width || dealt) return;
    const frame = requestAnimationFrame(() => setDealt(true));
    const timer = window.setTimeout(
      () => setIntroDone(true),
      800 + newsletters.length * 70
    );
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [width, dealt, newsletters.length]);

  const n = newsletters.length;
  const cardWidth = width < 640 ? 150 : 220;
  const cardHeight = cardWidth * COVER_RATIO;
  // The spread spans the full window so pushed covers aren't clipped,
  // but the fan itself stays within a comfortable reading width
  const fanSpace = Math.min(width, 1100) - 48;
  const step =
    n > 1
      ? Math.max(28, Math.min(cardWidth * 0.75, (fanSpace - cardWidth) / (n - 1)))
      : 0;
  const tiltStep = n > 1 ? Math.min(6, (MAX_TILT * 2) / (n - 1)) : 0;
  const push = cardWidth * 0.45; // how far neighbours slide away from a hovered cover
  const arcDepth = 0.12; // px of drop per px from centre, squared-ish curve

  const layout = (i: number) => {
    const offset = i - (n - 1) / 2;
    let x = offset * step;
    let y = Math.abs(offset * step) * arcDepth + Math.pow(offset, 2) * 1.5;
    let rotate = offset * tiltStep;
    let scale = 1;
    let z = i + 1;

    if (!dealt) {
      // Stacked deck in the middle before the deal
      return { x: 0, y: 30, rotate: (i % 2 ? 1 : -1) * 2, scale: 0.92, z };
    }
    if (hovered !== null) {
      if (i === hovered) {
        // Grow upward from the bottom edge (no translate), so the cover never
        // slides out from under the cursor and flickers
        rotate = 0;
        scale = 1.12;
        z = n + 10;
      } else {
        // Neighbours slide away, closer ones a bit further
        const distance = Math.abs(i - hovered);
        const shift = push * (1 + 0.4 / distance);
        x += i < hovered ? -shift : shift;
        rotate += i < hovered ? -3 : 3;
        y += 8;
      }
    }
    return { x, y, rotate, scale, z };
  };

  const handleClick = (i: number, e: React.MouseEvent) => {
    // On touch screens, the first tap selects; the second opens
    if (lastPointer.current !== "mouse" && hovered !== i) {
      e.preventDefault();
      hoverOn(i);
    }
  };

  const active = hovered !== null ? newsletters[hovered] : null;

  return (
    <div>
      <div
        ref={containerRef}
        className="relative w-screen left-1/2 -ml-[50vw] overflow-x-clip"
        style={{ height: cardHeight + 120 }}
        onClick={(e) => {
          // Tapping empty space clears the selection on touch screens
          if (e.target === e.currentTarget) setHovered(null);
        }}
      >
        <div
          className="absolute left-1/2 top-12"
          style={{ width: 0, height: cardHeight }}
        >
          {newsletters.map((newsletter, i) => {
            const { x, y, rotate, scale, z } = layout(i);
            return (
              <a
                key={newsletter.id}
                href={newsletter.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${newsletter.title}, ${formatDate(newsletter.issueDate)}`}
                onPointerDown={(e) => (lastPointer.current = e.pointerType)}
                onMouseEnter={() => hoverOn(i)}
                onMouseLeave={hoverOff}
                onFocus={() => hoverOn(i)}
                onBlur={hoverOff}
                onClick={(e) => handleClick(i, e)}
                className="absolute top-0 block rounded-md overflow-hidden bg-white shadow-xl hover:shadow-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
                style={{
                  width: cardWidth,
                  height: cardHeight,
                  left: -cardWidth / 2,
                  zIndex: z,
                  transform: `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${scale})`,
                  transformOrigin: "50% 100%",
                  transition: `transform 600ms ${EASE}, box-shadow 300ms`,
                  transitionDelay: introDone ? "0ms" : `${i * 70}ms`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverUrl(newsletter.pdfUrl)}
                  alt=""
                  draggable={false}
                  className="w-full h-full object-cover select-none"
                />
              </a>
            );
          })}
        </div>
      </div>

      {/* Caption for the hovered issue */}
      <div
        className="min-h-[9rem] text-center"
        onMouseEnter={active ? keepHover : undefined}
        onMouseLeave={active ? hoverOff : undefined}
      >
        {active ? (
          <div key={active.id} className="newsletter-caption">
            <h3 className="text-3xl font-serif font-bold text-white">
              {active.title}
            </h3>
            <p className="mt-1 text-white/75">
              {formatDate(active.issueDate)}
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <a
                href={active.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-green px-5 py-2 rounded-lg hover:bg-gray-light transition-colors duration-300 font-semibold text-sm"
              >
                Open PDF
              </a>
              {active.canDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(active)}
                  disabled={deletingId === active.id}
                  className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  {deletingId === active.id ? "Deleting…" : "Delete"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="pt-6 text-white/75">
            {n} issue{n !== 1 ? "s" : ""} · hover over a cover to see it
          </p>
        )}
      </div>
    </div>
  );
}
