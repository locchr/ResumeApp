import Anthropic from "@anthropic-ai/sdk";
import { Candidate } from "./types";
import { GitHubStats } from "./github";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateVibeAssessment(
  candidate: Pick<Candidate, "name" | "title" | "firm">,
  githubStats: GitHubStats | null,
  signals: string[],
  vibeScore: number
): Promise<string> {
  const context = [
    `Name: ${candidate.name}`,
    `Title: ${candidate.title}`,
    `Firm: ${candidate.firm}`,
    `Vibe Coding Score: ${vibeScore}/100`,
    githubStats
      ? `GitHub: ${githubStats.publicRepos} repos, ${githubStats.recentCommits} recent commits, languages: ${githubStats.topLanguages.join(", ")}`
      : "No GitHub profile found",
    signals.length > 0 ? `Signals: ${signals.join("; ")}` : "No vibe coding signals found",
  ].join("\n");

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 150,
    messages: [
      {
        role: "user",
        content: `Based on this product manager's profile, write a single concise sentence (max 30 words) assessing their vibe coding ability and AI-forward mindset for recruiting purposes. Be direct and specific.\n\n${context}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type === "text") return content.text.trim();
  return "Unable to generate assessment.";
}
