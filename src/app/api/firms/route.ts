import { NextRequest, NextResponse } from "next/server";
import { getFirms, addFirm, deleteFirm } from "@/lib/data";
import { Firm } from "@/lib/types";
import { randomUUID } from "crypto";

export async function GET() {
  const firms = await getFirms();
  return NextResponse.json(firms);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const firm: Firm = {
    id: randomUUID(),
    name: body.name,
    aliases: body.aliases ?? [],
  };
  await addFirm(firm);
  return NextResponse.json(firm, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await deleteFirm(id);
  return NextResponse.json({ success: true });
}
