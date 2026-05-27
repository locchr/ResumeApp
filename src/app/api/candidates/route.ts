import { NextRequest, NextResponse } from "next/server";
import { getCandidates, deleteCandidate } from "@/lib/data";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const firm = searchParams.get("firm");
  const candidates = await getCandidates();
  const filtered = firm ? candidates.filter((c) => c.firm === firm) : candidates;
  return NextResponse.json(filtered);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await deleteCandidate(id);
  return NextResponse.json({ success: true });
}
