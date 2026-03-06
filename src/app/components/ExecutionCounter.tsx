"use client";

import { useCallback, useEffect, useState } from "react";

const REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

interface ExecData {
  used: number;
  limit: number;
  percent: number;
}

export default function ExecutionCounter() {
  const [data, setData] = useState<ExecData | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/executions");
      const json = await res.json();
      if (json.success) {
        setData({ used: json.used, limit: json.limit, percent: json.percent });
      }
    } catch {
      // silently fail — counter is non-critical
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [load]);

  if (!data) return null;

  const color =
    data.percent >= 90
      ? "var(--accent-red)"
      : data.percent >= 70
        ? "var(--accent-amber)"
        : "var(--accent-emerald)";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: color }}
        />
        <p className="text-xs font-medium" style={{ color: "var(--text-dim)" }}>
          <span style={{ color }}>{data.used.toLocaleString()}</span>
          {" / "}
          {data.limit.toLocaleString()} executions
        </p>
      </div>
      <div
        className="w-full h-1 rounded-full overflow-hidden"
        style={{ background: "var(--bg-secondary)", minWidth: 100 }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(data.percent, 100)}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}
