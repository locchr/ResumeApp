import { NextRequest, NextResponse } from "next/server";
import { serperSearch, parseLinkedInResult } from "@/lib/serper";
import { getCandidates, upsertCandidate } from "@/lib/data";
import { Candidate } from "@/lib/types";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const { firmName, firmId } = await req.json();
  if (!firmName) return NextResponse.json({ error: "firmName required" }, { status: 400 });

  // Search for product managers at the firm on LinkedIn
  // Keep queries simple — Serper 400s on too many quoted OR phrases
  const queries = [
    `"${firmName}" "product manager" site:linkedin.com/in`,
    `"${firmName}" "head of product" OR "VP product" OR "director of product" site:linkedin.com/in`,
    `"${firmName}" "senior product manager" OR "chief product officer" OR "product lead" site:linkedin.com/in`,
  ];

  const existingCandidates = await getCandidates();
  const existingUrls = new Set(existingCandidates.map((c) => c.linkedinUrl).filter(Boolean));

  const newCandidates: Candidate[] = [];
  const debug: Array<{ query: string; raw: number; parsed: number; sample: string[] }> = [];

  for (const query of queries) {
    let results;
    try {
      results = await serperSearch(query, 20);
    } catch (err) {
      debug.push({ query, raw: 0, parsed: 0, sample: [`ERROR: ${err instanceof Error ? err.message : String(err)}`] });
      continue;
    }

    let parsedCount = 0;
    const sample = results.slice(0, 3).map((r) => `${r.link} | ${r.title}`);

    for (const result of results) {
      const parsed = parseLinkedInResult(result);
      if (!parsed) continue;
      parsedCount++;
      if (existingUrls.has(parsed.linkedinUrl)) continue;
      existingUrls.add(parsed.linkedinUrl);

      const candidate: Candidate = {
        id: randomUUID(),
        name: parsed.name,
        title: parsed.title || "Product Manager",
        firm: firmName,
        linkedinUrl: parsed.linkedinUrl,
        vibeScore: 0,
        scoreBreakdown: { githubActivity: 0, aiToolMentions: 0, projectsBuilt: 0 },
        signals: [],
        evidence: [],
        assessment: "",
        status: "pending",
      };

      await upsertCandidate(candidate);
      newCandidates.push(candidate);
    }

    debug.push({ query, raw: results.length, parsed: parsedCount, sample });
  }

  return NextResponse.json({
    found: newCandidates.length,
    candidates: newCandidates,
    firmId,
    debug,
  });
}
