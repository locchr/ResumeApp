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
    // 1. Search across all relevant platforms
    const searchQueries = [
      `"${candidate.name}" github`,
      `"${candidate.name}" vibe coding OR cursor OR "built with AI" OR "claude" OR "copilot"`,
      `"${candidate.name}" product manager portfolio`,
      `"${candidate.name}" site:linkedin.com`,
      `"${candidate.name}" site:medium.com`,
      `"${candidate.name}" site:reddit.com`,
      `"${candidate.name}" site:producthunt.com`,
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

    for (const r of allResults) {
      const extracted = extractGitHubUsername(r.link) || extractGitHubUsername(r.snippet);
      if (extracted) {
        githubUsername = extracted;
        break;
      }
    }

    if (!githubUsername) {
      githubUsername = await searchGitHubUser(candidate.name);
    }

    // 3. Get GitHub stats (with AI repo topics and deployed apps)
    const githubStats = githubUsername ? await getGitHubStats(githubUsername) : null;

    // 4. Extract signals and evidence
    const webSignals = extractSignalsFromSearchResults(allResults);
    if (githubStats) {
      webSignals.push(`GitHub: ${githubStats.publicRepos} public repos`);
      if (githubStats.aiTopicRepos > 0) webSignals.push(`${githubStats.aiTopicRepos} AI-focused repos`);
      if (githubStats.deployedApps > 0) webSignals.push(`${githubStats.deployedApps} deployed apps`);
      if (githubStats.personalWebsite) webSignals.push(`Personal site: ${githubStats.personalWebsite}`);
    }
    const evidence = extractEvidenceFromSearchResults(allResults, githubStats?.profileUrl);

    // 5. Calculate score
    const { vibeScore, scoreBreakdown } = calculateVibeScore(githubStats, webSignals);

    // 6. Build platform summary for Claude assessment
    const platformParts: string[] = [];
    if (allResults.some((r) => r.link.includes("linkedin.com"))) {
      const linkedinSnippets = allResults
        .filter((r) => r.link.includes("linkedin.com"))
        .map((r) => r.title)
        .slice(0, 2)
        .join("; ");
      platformParts.push(`LinkedIn: ${linkedinSnippets}`);
    }
    if (allResults.some((r) => r.link.includes("medium.com"))) {
      platformParts.push("Medium articles found");
    }
    if (allResults.some((r) => r.link.includes("reddit.com"))) {
      platformParts.push("Reddit discussions found");
    }
    if (allResults.some((r) => r.link.includes("producthunt.com"))) {
      platformParts.push("Product Hunt presence found");
    }
    if (githubStats?.aiRepoNames.length) {
      platformParts.push(`AI repos: ${githubStats.aiRepoNames.slice(0, 5).join(", ")}`);
    }
    if (githubStats?.deployedApps) {
      platformParts.push(`${githubStats.deployedApps} GitHub repos with live deployments`);
    }
    if (githubStats?.personalWebsite) {
      platformParts.push(`Personal site: ${githubStats.personalWebsite}`);
    }
    const platformSummary = platformParts.length > 0 ? platformParts.join(" | ") : undefined;

    // 7. Generate AI assessment
    let assessment = "";
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        assessment = await generateVibeAssessment(
          candidate,
          githubStats,
          webSignals,
          vibeScore,
          platformSummary
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
