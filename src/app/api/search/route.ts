import { NextRequest, NextResponse } from "next/server";
import { serperSearch, parseLinkedInResult, extractLinkedInHandle } from "@/lib/serper";
import { getCandidates, upsertCandidate } from "@/lib/data";
import { Candidate } from "@/lib/types";
import { randomUUID } from "crypto";

function nameFromSlug(slug: string): string {
  const parts = slug.split("-");
  const last = parts[parts.length - 1];
  // Strip trailing segment if it looks like a random ID (mixes letters and digits)
  const isRandomId = parts.length > 1 && /^[a-z0-9]{4,}$/.test(last) && /[0-9]/.test(last) && /[a-z]/.test(last);
  const words = isRandomId ? parts.slice(0, -1) : parts;
  return words.filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || slug;
}

export async function POST(req: NextRequest) {
  const { firmName, firmId, personName, division, linkedinUrl } = await req.json();

  if (!personName && !firmName && !linkedinUrl) {
    return NextResponse.json({ error: "firmName, personName, or linkedinUrl required" }, { status: 400 });
  }

  const existingCandidates = await getCandidates();
  const existingUrls = new Set(existingCandidates.map((c) => c.linkedinUrl).filter(Boolean));

  const newCandidates: Candidate[] = [];

  // LinkedIn URL lookup mode — resolve name via Serper, then upsert as pending
  if (linkedinUrl) {
    if (existingUrls.has(linkedinUrl)) {
      return NextResponse.json({ found: 0, candidates: [], firmId });
    }

    const handle = extractLinkedInHandle(linkedinUrl);
    let name = "";
    let title = "";
    let resolvedUrl = linkedinUrl;

    if (handle) {
      try {
        const results = await serperSearch(`site:linkedin.com/in/${handle}`, 3);
        for (const result of results) {
          const parsed = parseLinkedInResult(result);
          if (parsed) {
            name = parsed.name;
            title = parsed.title;
            resolvedUrl = parsed.linkedinUrl;
            break;
          }
        }
      } catch {
        // fall through to slug-based name
      }
      if (!name) name = nameFromSlug(handle);
    }

    if (!name) {
      return NextResponse.json({ found: 0, candidates: [], firmId });
    }

    if (!existingUrls.has(resolvedUrl)) {
      const candidate: Candidate = {
        id: randomUUID(),
        name,
        title: title || "",
        firm: "",
        linkedinUrl: resolvedUrl,
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

    return NextResponse.json({ found: newCandidates.length, candidates: newCandidates, firmId });
  }

  // For diversified firms (e.g. Goldman Sachs), use the division name as the search term
  // so we target "Goldman Sachs Asset Management" PMs, not IBD PMs.
  // Candidates are still stored under the canonical firmName.
  const searchTerm = division ?? firmName;

  const queries: string[] = personName
    ? [
        `"${personName}" site:linkedin.com/in`,
        ...(firmName ? [`"${personName}" "${firmName}" site:linkedin.com/in`] : []),
      ]
    : [
        // Simple queries — no OR operators, Serper 400s on complex boolean syntax
        `"${searchTerm}" "product manager" site:linkedin.com/in`,
        `"${searchTerm}" "head of product" site:linkedin.com/in`,
        `"${searchTerm}" "VP product" site:linkedin.com/in`,
        `"${searchTerm}" "senior product manager" site:linkedin.com/in`,
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
