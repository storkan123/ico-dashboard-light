import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const N8N_API_URL = (process.env.N8N_API_URL || "https://jian123.app.n8n.cloud").trim();
const N8N_API_KEY = (process.env.N8N_API_KEY || "").trim();
const EXECUTION_LIMIT = parseInt(process.env.N8N_EXECUTION_LIMIT || "2500", 10);

interface ExecutionItem {
  id: string;
  startedAt: string;
  status: string;
}

async function countExecutionsThisMonth(): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  let count = 0;
  let cursor: string | undefined;

  for (;;) {
    const url = new URL(`${N8N_API_URL}/api/v1/executions`);
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString(), {
      headers: { "X-N8N-API-KEY": N8N_API_KEY },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`n8n API returned ${res.status}`);
    const json = await res.json();
    const executions: ExecutionItem[] = json.data || [];

    if (executions.length === 0) break;

    let reachedOlderMonth = false;
    for (const exec of executions) {
      const started = new Date(exec.startedAt);
      if (started < monthStart) {
        reachedOlderMonth = true;
        break;
      }
      count++;
    }

    if (reachedOlderMonth || !json.nextCursor) break;
    cursor = json.nextCursor;
  }

  return count;
}

export async function GET() {
  if (!N8N_API_KEY) {
    return NextResponse.json(
      { success: false, error: "N8N_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const used = await countExecutionsThisMonth();
    return NextResponse.json({
      success: true,
      used,
      limit: EXECUTION_LIMIT,
      percent: Math.round((used / EXECUTION_LIMIT) * 100),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 502 }
    );
  }
}
