"use client";

import { useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/\\[]{}";

/** Decodes text from random glyphs into its final value, like a terminal resolving a signal. */
export function ScrambleText({
  text,
  className,
  duration = 900,
  delay = 0,
  hover = false,
}: {
  text: string;
  className?: string;
  duration?: number;
  delay?: number;
  hover?: boolean;
}) {
  const [out, setOut] = useState(text);
  const frame = useRef<number | null>(null);

  const run = () => {
    if (frame.current) cancelAnimationFrame(frame.current);
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const t = Math.max(0, Math.min(1, (now - start) / duration));
      const revealed = Math.floor(t * text.length);
      let s = "";
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (i < revealed || c === " ") s += c;
        else s += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setOut(s);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    run();
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <span className={className} onMouseEnter={hover ? run : undefined} aria-label={text}>
      <span aria-hidden>{out}</span>
    </span>
  );
}
