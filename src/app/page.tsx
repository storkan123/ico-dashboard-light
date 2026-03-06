"use client";

import { useCallback, useEffect, useState } from "react";
import { WorkOrder } from "@/app/lib/types";
import StatsBar from "@/app/components/StatsBar";
import KanbanBoard from "@/app/components/KanbanBoard";
import ExecutionCounter from "@/app/components/ExecutionCounter";

const REFRESH_INTERVAL = 30_000;

export default function ActiveWorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await fetch("/api/workorders");
      const json = await res.json();
      if (json.success) {
        setWorkOrders(json.data);
        setError(null);
      } else {
        setError(json.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);
    const interval = setInterval(() => load(false), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [load]);

  const active = workOrders.filter(
    (wo) => wo.stage !== "complete" && wo.stage !== "incomplete"
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div
            className="inline-block w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mb-4"
            style={{ borderColor: "var(--accent-blue)", borderTopColor: "transparent" }}
          />
          <p style={{ color: "var(--text-muted)" }}>Loading work orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-xl p-6 text-center border"
        style={{
          background: "var(--stage-emergency-bg)",
          borderColor: "var(--stage-emergency-border)",
        }}
      >
        <p className="font-medium" style={{ color: "var(--stage-emergency-text)" }}>
          Failed to load work orders
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          {error}
        </p>
        <button
          onClick={() => load(true)}
          className="mt-4 px-4 py-2 text-sm rounded-lg transition-colors"
          style={{
            background: "var(--stage-emergency-bg)",
            color: "var(--stage-emergency-text)",
            border: "1px solid var(--stage-emergency-border)",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Active Work Orders
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
            Real-time pipeline for ICO Real Estate Group
          </p>
        </div>
        <ExecutionCounter />
      </div>

      <StatsBar workOrders={workOrders} />
      <KanbanBoard workOrders={active} />
    </div>
  );
}
