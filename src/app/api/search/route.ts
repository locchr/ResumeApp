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

  for (const query of queries) {
    let results;
    try {
      results = await serperSearch(query, 20);
    } catch {
      continue; // skip this query, keep going with the others
    }

    for (const result of results) {
      const parsed = parseLinkedInResult(result);
      if (!parsed) continue;
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
  }

  return NextResponse.json({
    found: newCandidates.length,
    candidates: newCandidates,
    firmId,
  });
}
