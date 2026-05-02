import Parallel from "parallel-web";
import { BRANDS, type Brand } from "../config.js";
import type { WebResult } from "../types.js";

const client = new Parallel();

const SOCIAL_DOMAINS = ["tiktok.com", "instagram.com", "x.com", "twitter.com"];

function bestMatchingBrand(text: string): Brand | null {
  const lower = text.toLowerCase();
  for (const brand of BRANDS) {
    if (lower.includes(brand)) return brand;
  }
  return null;
}

export async function fetchWeb(): Promise<WebResult[]> {
  const objective = `Find recent open-web mentions of the Nigerian fintech savings apps PiggyVest and Cowrywise from the past 7 days. Prioritize news articles, blog posts, forum threads (Nairaland, Quora, Reddit, Medium), partnership and product announcements, and user complaints. Also include any indexed posts from ${SOCIAL_DOMAINS.join(", ")} that happen to surface — they are bonus signal.`;

  const search_queries = [
    "piggyvest news partnerships",
    "cowrywise news partnerships",
    "piggyvest complaints reviews",
    "cowrywise complaints reviews",
  ];

  const search = await client.search({
    objective,
    search_queries,
    mode: "advanced",
  });

  const out: WebResult[] = [];
  const seen = new Set<string>();
  for (const r of search.results ?? []) {
    if (!r.url || seen.has(r.url)) continue;
    const excerpt = (r.excerpts ?? []).join(" — ").slice(0, 1200);
    const brand = bestMatchingBrand(`${r.title ?? ""} ${excerpt}`);
    if (!brand) continue;
    seen.add(r.url);
    out.push({ brand, url: r.url, title: r.title ?? "", excerpt });
  }
  return out;
}
