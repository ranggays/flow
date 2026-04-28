import { NextRequest, NextResponse } from "next/server";

const PYTHON_BASE = "http://127.0.0.1:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...payload } = body;

    // map, endpoint python
    const endpointMap: Record<string, string> = {
      analyze: "/api/web-analyzer/analyze",
      search:  "/api/web-analyzer/search",
      chat:    "/api/web-analyzer/chat",
    };

    const endpoint = endpointMap[action];
    if (!endpoint) {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    let pythonPayload = payload;
    if (action === "chat") {
      pythonPayload = {
        messages: payload.messages,
        analysis_context: payload.analysisContext, 
      };
    }

    const res = await fetch(`${PYTHON_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pythonPayload),
    });

    const data = await res.json();
    return NextResponse.json(data);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}