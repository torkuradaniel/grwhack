import OpenAI from "openai";
import { env, OPENAI_MODEL } from "./config.js";
import type {
  ClassifiedPost,
  ClassifiedWebResult,
  SocialClassification,
  SocialPost,
  WebClassification,
  WebResult,
} from "./types.js";

const openai = new OpenAI({ apiKey: env.openaiApiKey });

const SOCIAL_SYSTEM = `You classify social-media posts about Nigerian fintech savings apps (PiggyVest, Cowrywise) for a growth marketer who is hunting for two things:

1. OUTREACH TARGETS — creators who post organically (no #ad, #sponsored, no obvious partnership language) about these apps and have meaningful audience + engagement. The marketer wants to DM them and turn them into paid creators for a *competing* app, so unsponsored advocacy is the strongest signal.

2. VIRAL CONTENT TO STUDY — posts that pop relative to the author's audience size, regardless of whether the creator is sponsored. The marketer wants to reverse-engineer the hooks, formats, and angles for their own content.

Also flag NEGATIVE_SIGNAL posts (complaints, scam allegations, outages) as competitive intel.

Drop everything else as NOISE — including off-topic mentions, spam, low-effort posts with zero engagement, and obvious bot accounts.

Scoring rubric:
- outreach_score (0–10): unsponsored × positive sentiment × audience size × engagement-per-follower. A 5k-follower creator with 2k likes on a glowing PiggyVest review = 9. A 50-follower account with 3 likes = 1. A sponsored post regardless of size = 0.
- virality_score (0–10): raw reach + engagement-per-follower ratio. A post with 500k views from a 10k-follower account = 10. A post with 200 views from a 100k-follower account = 2.
- hook: one sentence in plain English describing what made this post work (or fail). Be specific — name the format, the angle, the emotional beat.

Return ONLY valid JSON matching the requested schema. No prose.`;

const WEB_SYSTEM = `You classify open-web results (news articles, blog posts, forum threads, PR pages) about Nigerian fintech savings apps (PiggyVest, Cowrywise) for a growth marketer building competitive intelligence.

Categorize each result:
- NARRATIVE — articles or threads shaping the conversation around the brand (reviews, opinion pieces, comparisons). Strategic if widely-read.
- COMPETITIVE_MOVE — partnership announcements, new product launches, funding news, regulatory updates. Almost always strategically relevant.
- COMPLAINT_PATTERN — recurring user complaints (withdrawal issues, customer service, hidden fees). Useful for the marketer's own product positioning.
- NOISE — generic listicles ("top 10 apps in Nigeria"), SEO spam, irrelevant matches, content older than 30 days that's just being re-indexed.

For takeaway, write 1–2 sentences that capture the actual angle — not a generic summary. Imagine the marketer is reading 30 of these in a row at 8am; help them decide in 3 seconds whether to click through.

Return ONLY valid JSON matching the requested schema. No prose.`;

const SOCIAL_SCHEMA = {
  type: "object" as const,
  additionalProperties: false,
  required: ["sentiment", "is_sponsored", "outreach_score", "virality_score", "hook", "category"],
  properties: {
    sentiment: { type: "string", enum: ["positive", "negative", "neutral"] },
    is_sponsored: { type: "string", enum: ["likely", "unlikely"] },
    outreach_score: { type: "integer", minimum: 0, maximum: 10 },
    virality_score: { type: "integer", minimum: 0, maximum: 10 },
    hook: { type: "string" },
    category: {
      type: "string",
      enum: ["outreach_target", "viral_to_study", "negative_signal", "noise"],
    },
  },
};

const WEB_SCHEMA = {
  type: "object" as const,
  additionalProperties: false,
  required: ["source_type", "sentiment", "takeaway", "strategic_relevance", "category"],
  properties: {
    source_type: { type: "string", enum: ["news", "blog", "forum", "pr", "other"] },
    sentiment: { type: "string", enum: ["positive", "negative", "neutral", "mixed"] },
    takeaway: { type: "string" },
    strategic_relevance: { type: "string", enum: ["high", "medium", "low"] },
    category: {
      type: "string",
      enum: ["narrative", "competitive_move", "complaint_pattern", "noise"],
    },
  },
};

function describeSocial(p: SocialPost): string {
  return JSON.stringify({
    platform: p.platform,
    brand: p.brand,
    text: p.text,
    author: p.authorHandle,
    followers: p.authorFollowers,
    likes: p.likes,
    views: p.views,
    comments: p.comments,
    posted_at: p.postedAt,
    url: p.url,
  });
}

function describeWeb(r: WebResult): string {
  return JSON.stringify({ brand: r.brand, title: r.title, excerpt: r.excerpt, url: r.url });
}

async function classifyOne<T>(
  system: string,
  userJson: string,
  schema: Record<string, unknown>,
  schemaName: string,
): Promise<T> {
  const res = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userJson },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: schemaName, strict: true, schema },
    },
  });
  const content = res.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned empty content");
  return JSON.parse(content) as T;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function classifySocial(posts: SocialPost[]): Promise<ClassifiedPost[]> {
  const out = await mapWithConcurrency(posts, 5, async (p) => {
    try {
      const classification = await classifyOne<SocialClassification>(
        SOCIAL_SYSTEM,
        describeSocial(p),
        SOCIAL_SCHEMA,
        "social_classification",
      );
      return { ...p, classification };
    } catch (err) {
      console.warn(`[filter] social classify failed for ${p.url}:`, err);
      return null;
    }
  });
  return out.filter((x): x is ClassifiedPost => x !== null);
}

export async function classifyWeb(results: WebResult[]): Promise<ClassifiedWebResult[]> {
  const out = await mapWithConcurrency(results, 5, async (r) => {
    try {
      const classification = await classifyOne<WebClassification>(
        WEB_SYSTEM,
        describeWeb(r),
        WEB_SCHEMA,
        "web_classification",
      );
      return { ...r, classification };
    } catch (err) {
      console.warn(`[filter] web classify failed for ${r.url}:`, err);
      return null;
    }
  });
  return out.filter((x): x is ClassifiedWebResult => x !== null);
}
