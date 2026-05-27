import { NextResponse } from "next/server";
import { getCandidates } from "@/lib/data";

export async function GET() {
  const candidates = await getCandidates();
  const enriched = candidates.filter((c) => c.status === "enriched");

  const header = [
    "Name",
    "Title",
    "Firm",
    "Vibe Score",
    "GitHub Score",
    "AI Signals Score",
    "Projects Score",
    "LinkedIn",
    "GitHub",
    "GitHub Repos",
    "Top Languages",
    "Signals",
    "Assessment",
  ].join(",");

  const rows = enriched.map((c) => {
    const esc = (s: string) => `"${(s ?? "").replace(/"/g, '""')}"`;
    return [
      esc(c.name),
      esc(c.title),
      esc(c.firm),
      c.vibeScore,
      c.scoreBreakdown.githubActivity,
      c.scoreBreakdown.aiToolMentions,
      c.scoreBreakdown.projectsBuilt,
      esc(c.linkedinUrl ?? ""),
      esc(c.githubUrl ?? ""),
      c.githubStats?.publicRepos ?? "",
      esc((c.githubStats?.topLanguages ?? []).join("; ")),
      esc(c.signals.join("; ")),
      esc(c.assessment),
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="vibe-coders-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
