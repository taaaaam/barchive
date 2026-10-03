"use client";
import { useLayoutEffect, useRef, useState } from "react";

interface HandwrittenTextProps {
  text: string;
  delay?: number; // ms before the first letter starts
  letterDelay?: number; // ms between letters
}

// Renders text as if it's being written by hand: each letter's outline is
// traced like a pen stroke, one after another, then fills in. The real text
// stays in the layout (invisible) to size the element and for screen readers;
// an SVG copy is laid exactly over it once the font has loaded and been measured.
export default function HandwrittenText({
  text,
  delay = 150,
  letterDelay = 85,
}: HandwrittenTextProps) {
  const boxRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const [offsetY, setOffsetY] = useState<number | null>(null);

  useLayoutEffect(() => {
    let cancelled = false;
    let fontReady = false;
    const box = boxRef.current;
    if (!box) return;

    const measure = () => {
      const svgText = textRef.current;
      if (!svgText || cancelled || !fontReady) return;
      // Place the SVG text so its glyph box sits where the browser placed the
      // invisible HTML text. bbox.y depends on the y we already set, so work
      // from the baseline (bbox.y - current y) to keep re-measuring stable.
      const currentY = parseFloat(svgText.getAttribute("y") || "0");
      const bbox = svgText.getBBox();
      const ascent = currentY - bbox.y;
      const boxHeight = box.getBoundingClientRect().height;
      const next = ascent + (boxHeight - bbox.height) / 2;
      setOffsetY((prev) =>
        prev !== null && Math.abs(prev - next) < 0.25 ? prev : next
      );
    };

    // Measure only once the actual font is loaded (document.fonts.ready alone
    // can resolve before the font has even been requested), and again whenever
    // fonts finish loading or the element changes size.
    const style = getComputedStyle(box);
    document.fonts
      .load(`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`, text)
      .catch(() => {})
      .finally(() => {
        fontReady = true;
        if (!cancelled) requestAnimationFrame(measure);
      });
    document.fonts.addEventListener("loadingdone", measure);
    const observer = new ResizeObserver(measure);
    observer.observe(box);

    return () => {
      cancelled = true;
      document.fonts.removeEventListener("loadingdone", measure);
      observer.disconnect();
    };
  }, [text]);

  return (
    <span ref={boxRef} className="relative inline-block" aria-label={text}>
      <span className="invisible" aria-hidden="true">
        {text}
      </span>
      <svg
        aria-hidden="true"
        className="absolute inset-0 w-full h-full overflow-visible"
        style={{ visibility: offsetY === null ? "hidden" : "visible" }}
      >
        <text
          ref={textRef}
          x="0"
          y={offsetY ?? 0}
          style={{ font: "inherit", whiteSpace: "pre" }}
        >
          {Array.from(text).map((char, i) => (
            <tspan
              key={i}
              // Only start writing once the overlay is in place and visible
              className={offsetY === null ? undefined : "handwritten-letter"}
              style={{
                animationDelay: `${delay + i * letterDelay}ms, ${
                  delay + i * letterDelay + 450
                }ms`,
              }}
            >
              {char}
            </tspan>
          ))}
        </text>
      </svg>
    </span>
  );
}
