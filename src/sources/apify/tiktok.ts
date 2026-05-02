import { BRANDS, RESULTS_PER_PLATFORM, type Brand } from "../../config.js";
import type { SocialPost } from "../../types.js";
import { runActor } from "./client.js";

const ACTOR = "clockworks/tiktok-scraper";

interface TikTokItem {
  id?: string;
  text?: string;
  webVideoUrl?: string;
  createTimeISO?: string;
  playCount?: number;
  diggCount?: number;
  commentCount?: number;
  shareCount?: number;
  authorMeta?: {
    name?: string;
    fans?: number;
  };
  searchHashtag?: { name?: string };
  input?: string;
}

function brandFromItem(item: TikTokItem): Brand | null {
  const haystack = `${item.text ?? ""} ${item.searchHashtag?.name ?? ""} ${item.input ?? ""}`.toLowerCase();
  for (const brand of BRANDS) {
    if (haystack.includes(brand)) return brand;
  }
  return null;
}

export async function fetchTikTok(): Promise<SocialPost[]> {
  const items = await runActor<TikTokItem>(ACTOR, {
    hashtags: BRANDS.flatMap((b) => [b]),
    search: BRANDS.join(" OR "),
    resultsPerPage: RESULTS_PER_PLATFORM,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
  });

  const posts: SocialPost[] = [];
  for (const item of items) {
    if (!item.webVideoUrl) continue;
    const brand = brandFromItem(item);
    if (!brand) continue;
    posts.push({
      platform: "tiktok",
      brand,
      url: item.webVideoUrl,
      text: item.text ?? "",
      authorHandle: item.authorMeta?.name ?? "",
      authorFollowers: item.authorMeta?.fans ?? null,
      likes: item.diggCount ?? null,
      views: item.playCount ?? null,
      comments: item.commentCount ?? null,
      postedAt: item.createTimeISO ?? null,
    });
  }
  return posts;
}
