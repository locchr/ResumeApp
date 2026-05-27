import { NextRequest, NextResponse } from "next/server";
import { serperSearch, parseLinkedInResult } from "@/lib/serper";
import { getCandidates, upsertCandidate } from "@/lib/data";
import { Candidate } from "@/lib/types";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const { firmName, firmId, personName } = await req.json();

  if (!personName && !firmName) {
    return NextResponse.json({ error: "firmName or personName required" }, { status: 400 });
  }

  const existingCandidates = await getCandidates();
  const existingUrls = new Set(existingCandidates.map((c) => c.linkedinUrl).filter(Boolean));

  const newCandidates: Candidate[] = [];

  const queries: string[] = personName
    ? [
        `"${personName}" site:linkedin.com/in`,
        ...(firmName ? [`"${personName}" "${firmName}" site:linkedin.com/in`] : []),
      ]
    : [
        // Simple queries — no OR operators, Serper 400s on complex boolean syntax
        `"${firmName}" "product manager" site:linkedin.com/in`,
        `"${firmName}" "head of product" site:linkedin.com/in`,
        `"${firmName}" "VP product" site:linkedin.com/in`,
        `"${firmName}" "senior product manager" site:linkedin.com/in`,
      ];

  const numResults = personName ? 5 : 10;

  for (const query of queries) {
    let results;
    try {
      results = await serperSearch(query, numResults);
    } catch {
      continue;
    }

    for (const result of results) {
      const parsed = parseLinkedInResult(result);
      if (!parsed) continue;
      if (existingUrls.has(parsed.linkedinUrl)) continue;
      existingUrls.add(parsed.linkedinUrl);

      const candidate: Candidate = {
        id: randomUUID(),
        name: parsed.name,
        title: parsed.title || (firmName ? "Product Manager" : ""),
        firm: firmName || "",
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
