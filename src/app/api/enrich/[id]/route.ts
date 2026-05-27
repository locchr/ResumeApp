import { NextRequest, NextResponse } from "next/server";
import { getCandidate, upsertCandidate } from "@/lib/data";
import { serperSearch } from "@/lib/serper";
import { searchGitHubUser, getGitHubStats, extractGitHubUsername } from "@/lib/github";
import { calculateVibeScore, extractSignalsFromSearchResults, extractEvidenceFromSearchResults } from "@/lib/scoring";
import { generateVibeAssessment } from "@/lib/anthropic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const candidate = await getCandidate(id);
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  try {
    // 1. Search for GitHub and vibe coding signals
    const searchQueries = [
      `"${candidate.name}" github`,
      `"${candidate.name}" vibe coding OR cursor OR "built with AI" OR "claude" OR "copilot"`,
      `"${candidate.name}" product manager portfolio`,
    ];

    let allResults: Array<{ title: string; snippet: string; link: string }> = [];
    for (const q of searchQueries) {
      try {
        const results = await serperSearch(q, 5);
        allResults = allResults.concat(results);
      } catch {
        // Continue with partial results
      }
    }

    // 2. Find GitHub username
    let githubUsername: string | null = null;

    // First try extracting from search results
    for (const r of allResults) {
      const extracted = extractGitHubUsername(r.link) || extractGitHubUsername(r.snippet);
      if (extracted) {
        githubUsername = extracted;
        break;
      }
    }

    // Fall back to GitHub search API
    if (!githubUsername) {
      githubUsername = await searchGitHubUser(candidate.name);
    }

    // 3. Get GitHub stats
    const githubStats = githubUsername ? await getGitHubStats(githubUsername) : null;

    // 4. Extract signals and evidence from web results
    const webSignals = extractSignalsFromSearchResults(allResults);
    if (githubStats) webSignals.push(`GitHub: ${githubStats.publicRepos} public repos`);
    const evidence = extractEvidenceFromSearchResults(allResults, githubStats?.profileUrl);

    // 5. Calculate score
    const { vibeScore, scoreBreakdown } = calculateVibeScore(githubStats, webSignals);

    // 6. Generate AI assessment (only if Anthropic key is set)
    let assessment = "";
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        assessment = await generateVibeAssessment(
          candidate,
          githubStats,
          webSignals,
          vibeScore
        );
      } catch {
        assessment = `Score ${vibeScore}/100 based on available signals.`;
      }
    } else {
      assessment = `Score ${vibeScore}/100 based on available signals.`;
    }

    const enriched = {
      ...candidate,
      githubUsername: githubUsername ?? undefined,
      githubUrl: githubStats?.profileUrl,
      githubStats: githubStats ?? undefined,
      vibeScore,
      scoreBreakdown,
      signals: webSignals,
      evidence,
      assessment,
      enrichedAt: new Date().toISOString(),
      status: "enriched" as const,
    };

    await upsertCandidate(enriched);
    return NextResponse.json(enriched);
  } catch (err) {
    const errored = {
      ...candidate,
      status: "error" as const,
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    };
    await upsertCandidate(errored);
    return NextResponse.json(errored, { status: 500 });
  }
}
