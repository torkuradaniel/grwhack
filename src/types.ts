import type { Brand } from "./config.js";

export type Platform = "tiktok" | "instagram" | "twitter";

export interface SocialPost {
  platform: Platform;
  brand: Brand;
  url: string;
  text: string;
  authorHandle: string;
  authorFollowers: number | null;
  likes: number | null;
  views: number | null;
  comments: number | null;
  postedAt: string | null;
}

export interface WebResult {
  brand: Brand;
  url: string;
  title: string;
  excerpt: string;
}

export interface SocialClassification {
  sentiment: "positive" | "negative" | "neutral";
  is_sponsored: "likely" | "unlikely";
  outreach_score: number;
  virality_score: number;
  hook: string;
  category: "outreach_target" | "viral_to_study" | "negative_signal" | "noise";
}

export interface WebClassification {
  source_type: "news" | "blog" | "forum" | "pr" | "other";
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  takeaway: string;
  strategic_relevance: "high" | "medium" | "low";
  category: "narrative" | "competitive_move" | "complaint_pattern" | "noise";
}

export type ClassifiedPost = SocialPost & { classification: SocialClassification };
export type ClassifiedWebResult = WebResult & { classification: WebClassification };
