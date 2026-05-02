import { BRANDS, RESULTS_PER_PLATFORM, type Brand } from "../../config.js";
import type { SocialPost } from "../../types.js";
import { runActor } from "./client.js";

const ACTOR = "apify/instagram-hashtag-scraper";

interface InstaItem {
  url?: string;
  shortCode?: string;
  caption?: string;
  hashtags?: string[];
  ownerUsername?: string;
  ownerFullName?: string;
  likesCount?: number;
  videoViewCount?: number;
  videoPlayCount?: number;
  commentsCount?: number;
  timestamp?: string;
  // Some actors include this; we'll use it if present
  ownerFollowersCount?: number;
}

function brandFromItem(item: InstaItem): Brand | null {
  const haystack = `${item.caption ?? ""} ${(item.hashtags ?? []).join(" ")}`.toLowerCase();
  for (const brand of BRANDS) {
    if (haystack.includes(brand)) return brand;
  }
  return null;
}

export async function fetchInstagram(): Promise<SocialPost[]> {
  const items = await runActor<InstaItem>(ACTOR, {
    hashtags: BRANDS.flatMap((b) => [b]),
    resultsLimit: RESULTS_PER_PLATFORM,
  });

  const posts: SocialPost[] = [];
  for (const item of items) {
    const url = item.url ?? (item.shortCode ? `https://www.instagram.com/p/${item.shortCode}/` : null);
    if (!url) continue;
    const brand = brandFromItem(item);
    if (!brand) continue;
    posts.push({
      platform: "instagram",
      brand,
      url,
      text: item.caption ?? "",
      authorHandle: item.ownerUsername ?? "",
      authorFollowers: item.ownerFollowersCount ?? null,
      likes: item.likesCount ?? null,
      views: item.videoPlayCount ?? item.videoViewCount ?? null,
      comments: item.commentsCount ?? null,
      postedAt: item.timestamp ?? null,
    });
  }
  return posts;
}
