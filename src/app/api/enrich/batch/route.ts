import { NextRequest, NextResponse } from "next/server";
import { getCandidates } from "@/lib/data";

export async function POST(req: NextRequest) {
  const { firm } = await req.json();
  const candidates = await getCandidates();
  const pending = candidates.filter(
    (c) => c.status === "pending" && (!firm || c.firm === firm)
  );

  // Trigger enrichment for each candidate (fire and return IDs)
  const ids = pending.map((c) => c.id);

  // Enrich sequentially in background — we return the list immediately
  // and the client polls for updates
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  // Non-blocking: kick off enrichment for each
  (async () => {
    for (const id of ids) {
      try {
        await fetch(`${baseUrl}/api/enrich/${id}`, { method: "POST" });
        await new Promise((r) => setTimeout(r, 500)); // rate limit buffer
      } catch {
        // continue
      }
    }
  })();

  return NextResponse.json({ queued: ids.length, ids });
}
