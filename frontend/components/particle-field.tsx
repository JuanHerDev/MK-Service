"use client";

import { useEffect, useRef } from "react";

/**
 * Rotating point-cloud sphere. Optional burstToken triggers explode → rewind.
 */
export function ParticleField({
  className,
  density = 900,
  accent = "61, 156, 240",
  burstToken = 0,
}: {
  className?: string;
  density?: number;
  accent?: string;
  /** Increment to trigger explode + 3s rewind to calm state */
  burstToken?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const burstRef = useRef(0);
  const burstStartRef = useRef(0);

  useEffect(() => {
    if (burstToken > 0) {
      burstRef.current = burstToken;
      burstStartRef.current = performance.now();
    }
  }, [burstToken]);

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

    const pts: { x: number; y: number; z: number; s: number; vx: number; vy: number; vz: number }[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < density; i++) {
      const y = 1 - (i / (density - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = golden * i;
      pts.push({
        x: Math.cos(th) * r,
        y,
        z: Math.sin(th) * r,
        s: Math.random(),
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        vz: (Math.random() - 0.5) * 2,
      });
    }
    const rings = [0.35, 1.1, 1.85].map((tilt, i) => ({
      tilt,
      radius: 1.25 + i * 0.18,
      speed: 0.4 + i * 0.25,
    }));

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

    const burstDuration = 3000; // ms total explode + rewind

    const draw = (time: number) => {
      const t = time / 1000;
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      ctx.clearRect(0, 0, w, h);

      let expand = 0; // 0 calm → 1 full explode
      if (burstRef.current > 0 && burstStartRef.current > 0) {
        const elapsed = time - burstStartRef.current;
        if (elapsed >= burstDuration) {
          burstRef.current = 0;
          expand = 0;
        } else if (elapsed < 900) {
          expand = elapsed / 900; // explode
        } else {
          expand = 1 - (elapsed - 900) / (burstDuration - 900); // rewind
        }
      }

      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.32 * (1 + expand * 1.8);
      const ay = t * 0.12 + mouse.x * 0.5 + expand * t * 2;
      const ax = 0.35 + mouse.y * 0.3;
      const cosY = Math.cos(ay);
      const sinY = Math.sin(ay);
      const cosX = Math.cos(ax);
      const sinX = Math.sin(ax);

      for (const p of pts) {
        let px = p.x + p.vx * expand * 1.4;
        let py = p.y + p.vy * expand * 1.4;
        let pz = p.z + p.vz * expand * 1.4;
        const x1 = px * cosY - pz * sinY;
        const z1 = px * sinY + pz * cosY;
        const y1 = py * cosX - z1 * sinX;
        const depth = (z1 * cosX + py * sinX + 1.2) / 2.2;
        const size = Math.max(0.6, depth * 2.2);
        const hot = p.s > 0.92;
        const alpha = Math.max(0.05, (0.15 + depth * 0.55) * (1 - expand * 0.35));
        ctx.fillStyle = hot
          ? `rgba(${accent}, ${0.5 + expand * 0.5})`
          : expand > 0.3
            ? `rgba(255, 80, 100, ${alpha})`
            : `rgba(232, 238, 245, ${alpha})`;
        ctx.fillRect(cx + x1 * R, cy + y1 * R, hot ? size * 1.8 : size, hot ? size * 1.8 : size);
      }

      if (expand < 0.85) {
        ctx.lineWidth = 1;
        for (const ring of rings) {
          ctx.beginPath();
          const steps = 120;
          for (let i = 0; i <= steps; i++) {
            const a = (i / steps) * Math.PI * 2;
            let x = Math.cos(a) * ring.radius;
            let y = 0;
            let z = Math.sin(a) * ring.radius;
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
          ctx.strokeStyle = `rgba(232, 238, 245, ${0.08 * (1 - expand)})`;
          ctx.stroke();
        }
      }

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
