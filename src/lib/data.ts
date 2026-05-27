import fs from "fs/promises";
import path from "path";
import { Firm, Candidate } from "./types";

// /tmp is writable on Vercel; fall back to local data/ in dev
const DATA_DIR = process.env.VERCEL
  ? "/tmp/vibe-pm-data"
  : path.join(process.cwd(), "data");
const FIRMS_FILE = path.join(DATA_DIR, "firms.json");
const CANDIDATES_FILE = path.join(DATA_DIR, "candidates.json");

const SEED_FIRMS_FILE = path.join(process.cwd(), "data", "firms.json");

async function ensureFile(filePath: string, defaultContent: string) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, defaultContent, "utf-8");
  }
}

export async function getFirms(): Promise<Firm[]> {
  // On first run in Vercel /tmp, seed from the bundled data/firms.json
  try {
    await fs.access(FIRMS_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      const seed = await fs.readFile(SEED_FIRMS_FILE, "utf-8");
      await fs.writeFile(FIRMS_FILE, seed, "utf-8");
    } catch {
      await fs.writeFile(FIRMS_FILE, "[]", "utf-8");
    }
  }
  const raw = await fs.readFile(FIRMS_FILE, "utf-8");
  return JSON.parse(raw);
}

export async function saveFirms(firms: Firm[]): Promise<void> {
  await ensureFile(FIRMS_FILE, "[]");
  await fs.writeFile(FIRMS_FILE, JSON.stringify(firms, null, 2), "utf-8");
}

export async function addFirm(firm: Firm): Promise<void> {
  const firms = await getFirms();
  firms.push(firm);
  await saveFirms(firms);
}

export async function deleteFirm(id: string): Promise<void> {
  const firms = await getFirms();
  await saveFirms(firms.filter((f) => f.id !== id));
}

export async function getCandidates(): Promise<Candidate[]> {
  await ensureFile(CANDIDATES_FILE, "[]");
  const raw = await fs.readFile(CANDIDATES_FILE, "utf-8");
  return JSON.parse(raw);
}

export async function saveCandidates(candidates: Candidate[]): Promise<void> {
  await ensureFile(CANDIDATES_FILE, "[]");
  await fs.writeFile(CANDIDATES_FILE, JSON.stringify(candidates, null, 2), "utf-8");
}

export async function upsertCandidate(candidate: Candidate): Promise<void> {
  const candidates = await getCandidates();
  const idx = candidates.findIndex((c) => c.id === candidate.id);
  if (idx >= 0) {
    candidates[idx] = candidate;
  } else {
    candidates.push(candidate);
  }
  await saveCandidates(candidates);
}

export async function getCandidate(id: string): Promise<Candidate | null> {
  const candidates = await getCandidates();
  return candidates.find((c) => c.id === id) ?? null;
}

export async function deleteCandidate(id: string): Promise<void> {
  const candidates = await getCandidates();
  await saveCandidates(candidates.filter((c) => c.id !== id));
}
