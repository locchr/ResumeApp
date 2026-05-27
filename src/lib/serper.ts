const SERPER_API_KEY = process.env.SERPER_API_KEY;
const SERPER_URL = "https://google.serper.dev/search";

export interface SerperResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

export interface SerperResponse {
  organic: SerperResult[];
  knowledgeGraph?: {
    title?: string;
    description?: string;
  };
}

export async function serperSearch(query: string, num = 10): Promise<SerperResult[]> {
  if (!SERPER_API_KEY) {
    throw new Error("SERPER_API_KEY is not configured");
  }

  const res = await fetch(SERPER_URL, {
    method: "POST",
    headers: {
      "X-API-KEY": SERPER_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num }),
  });

  if (!res.ok) {
    throw new Error(`Serper API error: ${res.status} ${res.statusText}`);
  }

  const data: SerperResponse = await res.json();
  return data.organic ?? [];
}

export function extractLinkedInHandle(url: string): string | null {
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  return match ? match[1] : null;
}

export function parseLinkedInResult(result: SerperResult): {
  name: string;
  title: string;
  linkedinUrl: string;
} | null {
  if (!result.link.includes("linkedin.com/in/")) return null;

  // Title format: "Name - Title at Firm | LinkedIn" or "Name | Title - Firm"
  const rawTitle = result.title.replace(/ \| LinkedIn$/, "").replace(/ - LinkedIn$/, "");

  // Try "Name - Title at Firm"
  const dashMatch = rawTitle.match(/^(.+?)\s*[-–]\s*(.+)$/);
  let name = rawTitle;
  let title = "";

  if (dashMatch) {
    name = dashMatch[1].trim();
    title = dashMatch[2].trim();
  }

  // Also try snippet for title if it's a better signal
  if (!title && result.snippet) {
    const snippetMatch = result.snippet.match(/^([^•·|]+)/);
    if (snippetMatch) title = snippetMatch[1].trim();
  }

  return { name, title, linkedinUrl: result.link };
}
