import { BRANDS, RESULTS_PER_PLATFORM, type Brand } from "../../config.js";
import type { SocialPost } from "../../types.js";
import { runActor } from "./client.js";

const ACTOR = "apidojo/tweet-scraper";

interface TweetItem {
  url?: string;
  text?: string;
  full_text?: string;
  createdAt?: string;
  likeCount?: number;
  viewCount?: number;
  replyCount?: number;
  retweetCount?: number;
  author?: {
    userName?: string;
    followers?: number;
  };
}

function brandFromItem(item: TweetItem): Brand | null {
  const text = (item.text ?? item.full_text ?? "").toLowerCase();
  for (const brand of BRANDS) {
    if (text.includes(brand)) return brand;
  }
  return null;
}

export async function fetchTwitter(): Promise<SocialPost[]> {
  const items = await runActor<TweetItem>(ACTOR, {
    searchTerms: BRANDS.flatMap((b) => [b, `#${b}`]),
    maxItems: RESULTS_PER_PLATFORM,
    sort: "Latest",
  });

  const posts: SocialPost[] = [];
  for (const item of items) {
    if (!item.url) continue;
    const brand = brandFromItem(item);
    if (!brand) continue;
    posts.push({
      platform: "twitter",
      brand,
      url: item.url,
      text: item.text ?? item.full_text ?? "",
      authorHandle: item.author?.userName ?? "",
      authorFollowers: item.author?.followers ?? null,
      likes: item.likeCount ?? null,
      views: item.viewCount ?? null,
      comments: item.replyCount ?? null,
      postedAt: item.createdAt ?? null,
    });
  }
  return posts;
}
