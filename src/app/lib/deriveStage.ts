import { Stage } from "./types";

export function deriveStage(row: Record<string, unknown>): Stage {
  const s = (v: unknown) => String(v ?? "").trim();

  const completed = s(row["Completed?"]).toLowerCase();
  if (completed === "complete") return "complete";
  if (completed === "incomplete") return "incomplete";

  const isEmergency = s(row.is_emergency).toLowerCase();
  if (isEmergency === "true") return "emergency";

  const vendor = s(row.Vendor);
  const dateOfJob = s(row["Date of Job"]);
  if (vendor && dateOfJob) return "scheduled";

  const hasReachout = s(row.Initial_Reachout);
  if (hasReachout) return "triaged";

  return "awaiting_reply";
}
