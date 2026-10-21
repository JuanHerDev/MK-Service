"use client";

import { useEffect, useState } from "react";
import { pad } from "@/lib/format";

export function Clock({ className }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clock starts after mount to avoid hydration mismatch
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!now) return <p className={className}>--:--:--</p>;
  return (
    <p className={className} suppressHydrationWarning>
      {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}{" "}
      <span className="text-dim">UTC{-now.getTimezoneOffset() / 60 >= 0 ? "+" : ""}{-now.getTimezoneOffset() / 60}</span>
    </p>
  );
}
