import { Octokit } from "@octokit/rest";

function getOctokit() {
  return new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });
}

export interface GitHubStats {
  publicRepos: number;
  followers: number;
  recentCommits: number;
  topLanguages: string[];
  hasRecentActivity: boolean;
  profileUrl: string;
  avatarUrl?: string;
  bio?: string;
}

export async function searchGitHubUser(name: string): Promise<string | null> {
  const octokit = getOctokit();
  try {
    const { data } = await octokit.search.users({
      q: `${name} in:name type:user`,
      per_page: 5,
    });

    if (data.items.length === 0) return null;
    // Return the first result with a reasonable match
    return data.items[0].login;
  } catch {
    return null;
  }
}

export async function getGitHubStats(username: string): Promise<GitHubStats | null> {
  const octokit = getOctokit();

  try {
    const { data: user } = await octokit.users.getByUsername({ username });

    // Get repos to find top languages
    const { data: repos } = await octokit.repos.listForUser({
      username,
      sort: "updated",
      per_page: 30,
      type: "owner",
    });

    // Count languages
    const languageCount: Record<string, number> = {};
    for (const repo of repos) {
      if (repo.language) {
        languageCount[repo.language] = (languageCount[repo.language] ?? 0) + 1;
      }
    }

    const topLanguages = Object.entries(languageCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang]) => lang);

    // Check recent activity (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentRepos = repos.filter(
      (r) => r.pushed_at && new Date(r.pushed_at) > sixMonthsAgo
    );

    // Estimate recent commits from events
    let recentCommits = 0;
    try {
      const { data: events } = await octokit.activity.listPublicEventsForUser({
        username,
        per_page: 100,
      });
      recentCommits = events.filter(
        (e) =>
          e.type === "PushEvent" &&
          new Date(e.created_at ?? "") > sixMonthsAgo
      ).length;
    } catch {
      // Events API may be rate-limited
    }

    return {
      publicRepos: user.public_repos,
      followers: user.followers,
      recentCommits,
      topLanguages,
      hasRecentActivity: recentRepos.length > 0,
      profileUrl: user.html_url,
      avatarUrl: user.avatar_url,
      bio: user.bio ?? undefined,
    };
  } catch {
    return null;
  }
}

export function extractGitHubUsername(text: string): string | null {
  const match = text.match(/github\.com\/([a-zA-Z0-9-]+)/i);
  if (match && match[1] !== "sponsors" && match[1] !== "orgs") {
    return match[1];
  }
  return null;
}
