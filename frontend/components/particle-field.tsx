"use client";

import { useEffect, useRef } from "react";

/**
 * Rotating point-cloud sphere with orbital rings, drawn on a 2D canvas.
 * Follows the pointer slightly; respects reduced motion.
 */
export function ParticleField({
  className,
  density = 900,
  accent = "212, 255, 63",
}: {
  className?: string;
  density?: number;
  accent?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    // Fibonacci sphere for an even distribution
    const pts: { x: number; y: number; z: number; s: number }[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < density; i++) {
      const y = 1 - (i / (density - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = golden * i;
      pts.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r, s: Math.random() });
    }
    const rings = [0.35, 1.1, 1.85].map((tilt, i) => ({ tilt, radius: 1.25 + i * 0.18, speed: 0.4 + i * 0.25 }));

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onMove = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove);

    const draw = (time: number) => {
      const t = time / 1000;
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.32;
      const ay = t * 0.12 + mouse.x * 0.5;
      const ax = 0.35 + mouse.y * 0.3;
      const cosY = Math.cos(ay);
      const sinY = Math.sin(ay);
      const cosX = Math.cos(ax);
      const sinX = Math.sin(ax);

      // sphere
      for (const p of pts) {
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.x * sinY + p.z * cosY;
        const y1 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;
        const depth = (z2 + 1) / 2; // 0 back .. 1 front
        const pulse = 0.5 + 0.5 * Math.sin(t * 2 + p.s * 12);
        const a = 0.08 + depth * 0.7 * (0.6 + 0.4 * pulse);
        const size = 0.6 + depth * 1.3;
        const hot = p.s > 0.985;
        ctx.fillStyle = hot ? `rgba(${accent}, ${0.4 + depth * 0.6})` : `rgba(233, 233, 228, ${a})`;
        ctx.fillRect(cx + x1 * R, cy + y1 * R, hot ? size * 1.8 : size, hot ? size * 1.8 : size);
      }

      // orbital rings
      ctx.lineWidth = 1;
      for (const ring of rings) {
        ctx.beginPath();
        const steps = 120;
        for (let i = 0; i <= steps; i++) {
          const a = (i / steps) * Math.PI * 2;
          let x = Math.cos(a) * ring.radius;
          let y = 0;
          let z = Math.sin(a) * ring.radius;
          // tilt around X
          const yT = y * Math.cos(ring.tilt) - z * Math.sin(ring.tilt);
          const zT = y * Math.sin(ring.tilt) + z * Math.cos(ring.tilt);
          y = yT;
          z = zT;
          const x1 = x * cosY - z * sinY;
          const z1 = x * sinY + z * cosY;
          const y1 = y * cosX - z1 * sinX;
          x = x1;
          if (i === 0) ctx.moveTo(cx + x * R, cy + y1 * R);
          else ctx.lineTo(cx + x * R, cy + y1 * R);
        }
        ctx.strokeStyle = "rgba(233, 233, 228, 0.08)";
        ctx.stroke();

        // satellite
        const sa = t * ring.speed;
        const sx = Math.cos(sa) * ring.radius;
        const sz = Math.sin(sa) * ring.radius;
        const syT = -sz * Math.sin(ring.tilt);
        const szT = sz * Math.cos(ring.tilt);
        const x1 = sx * cosY - szT * sinY;
        const z1 = sx * sinY + szT * cosY;
        const y1 = syT * cosX - z1 * sinX;
        ctx.fillStyle = `rgba(${accent}, 0.95)`;
        ctx.beginPath();
        ctx.arc(cx + x1 * R, cy + y1 * R, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(${accent}, 0.15)`;
        ctx.beginPath();
        ctx.arc(cx + x1 * R, cy + y1 * R, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      // crosshair
      ctx.strokeStyle = "rgba(233, 233, 228, 0.12)";
      ctx.beginPath();
      ctx.moveTo(cx - R * 1.6, cy);
      ctx.lineTo(cx - R * 1.45, cy);
      ctx.moveTo(cx + R * 1.45, cy);
      ctx.lineTo(cx + R * 1.6, cy);
      ctx.moveTo(cx, cy - R * 1.6);
      ctx.lineTo(cx, cy - R * 1.45);
      ctx.moveTo(cx, cy + R * 1.45);
      ctx.lineTo(cx, cy + R * 1.6);
      ctx.stroke();

      if (!reduce) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, [density, accent]);

  return <canvas ref={ref} className={className} aria-hidden />;
}
