import { NextResponse } from "next/server";
import { deriveStage } from "@/app/lib/deriveStage";
import { WorkOrder } from "@/app/lib/types";

export const dynamic = "force-dynamic";

const N8N_API_URL = process.env.N8N_API_URL || "https://jian123.app.n8n.cloud";
const N8N_API_KEY = process.env.N8N_API_KEY || "";
const WORKFLOW_ID = process.env.N8N_WORKFLOW_ID || "icAAQUI5JFUGFFkd";

interface ExecutionItem {
  json: Record<string, string>;
}

interface ExecutionRun {
  data?: { main?: ExecutionItem[][] };
}

interface ExecutionResponse {
  data?: {
    resultData?: {
      runData?: Record<string, ExecutionRun[]>;
    };
  };
}

interface ExecutionListItem {
  id: string;
  status: string;
  mode: string;
}

async function fetchFromExecutions(): Promise<Record<string, string>[]> {
  const listUrl = `${N8N_API_URL}/api/v1/executions?workflowId=${WORKFLOW_ID}&limit=1&status=success`;
  const listRes = await fetch(listUrl, {
    headers: { "X-N8N-API-KEY": N8N_API_KEY },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });

  if (!listRes.ok) throw new Error(`n8n API returned ${listRes.status}`);
  const listData = await listRes.json();
  const executions: ExecutionListItem[] = listData.data || [];
  const latest = executions.find((e) => e.status === "success");
  if (!latest) throw new Error("No successful execution found");

  const detailUrl = `${N8N_API_URL}/api/v1/executions/${latest.id}?includeData=true`;
  const detailRes = await fetch(detailUrl, {
    headers: { "X-N8N-API-KEY": N8N_API_KEY },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  if (!detailRes.ok) throw new Error(`n8n execution detail returned ${detailRes.status}`);
  const detail: ExecutionResponse = await detailRes.json();
  const runData = detail.data?.resultData?.runData || {};
  const excelNode = runData["Get All Work Orders"];
  if (!excelNode?.[0]?.data?.main?.[0]) throw new Error("No Excel data in execution");

  return excelNode[0].data.main[0].map((item) => item.json);
}

export async function GET() {
  if (!N8N_API_KEY) {
    return NextResponse.json(
      { success: false, error: "N8N_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const rows = await fetchFromExecutions();

    const workOrders: WorkOrder[] = rows
      .filter((row) => (row.work_request_number ?? "").trim() !== "")
      .map((row) => ({
        work_request_number: String(row.work_request_number ?? ""),
        work_request_date: String(row.work_request_date ?? ""),
        work_request_description: String(row.work_request_description ?? ""),
        property_name: String(row.property_name ?? ""),
        property_address: String(row.property_address ?? ""),
        unit: String(row.unit ?? ""),
        resident_name: String(row.resident_name ?? ""),
        resident_phone: String(row.resident_phone ?? ""),
        resident_email: String(row.resident_email ?? ""),
        permission_to_enter: String(row.permission_to_enter ?? ""),
        access_notes: String(row.access_notes ?? ""),
        is_emergency: String(row.is_emergency ?? ""),
        Initial_Reachout: String(row.Initial_Reachout ?? ""),
        "Initial Tenet Email Response":
          String(row["Initial Tenet Email Response"] ?? ""),
        Vendor: String(row.Vendor ?? ""),
        "Date of Job": String(row["Date of Job"] ?? ""),
        "Completed?": String(row["Completed?"] ?? ""),
        stage: deriveStage(row),
      }));

    return NextResponse.json({ success: true, data: workOrders });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 502 }
    );
  }
}
