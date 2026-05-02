import { createClient } from "@supabase/supabase-js";
import { env } from "./config.js";
import type { ClassifiedPost, ClassifiedWebResult, Platform, SocialPost, WebResult } from "./types.js";
import type { Brand } from "./config.js";

const supabase = createClient(env.supabaseUrl, env.supabaseServiceKey, {
  auth: { persistSession: false },
});

async function filterUnseen<T extends { url: string }>(
  table: "seen_social" | "seen_web",
  items: T[],
): Promise<T[]> {
  if (items.length === 0) return [];

  const urls = [...new Set(items.map((i) => i.url))];
  const seen = new Set<string>();

  const CHUNK = 200;
  for (let i = 0; i < urls.length; i += CHUNK) {
    const slice = urls.slice(i, i + CHUNK);
    const { data, error } = await supabase.from(table).select("url").in("url", slice);
    if (error) throw new Error(`Supabase select on ${table} failed: ${error.message}`);
    for (const row of data ?? []) seen.add(row.url);
  }

  const dedupedByUrl = new Map<string, T>();
  for (const item of items) {
    if (!seen.has(item.url) && !dedupedByUrl.has(item.url)) {
      dedupedByUrl.set(item.url, item);
    }
  }
  return [...dedupedByUrl.values()];
}

export const filterUnseenSocial = (posts: SocialPost[]) => filterUnseen("seen_social", posts);
export const filterUnseenWeb = (results: WebResult[]) => filterUnseen("seen_web", results);

export async function markSocialSeen(posts: ClassifiedPost[]): Promise<void> {
  if (posts.length === 0) return;
  const rows = posts.map((p) => ({
    url: p.url,
    platform: p.platform satisfies Platform,
    brand: p.brand satisfies Brand,
  }));
  const { error } = await supabase
    .from("seen_social")
    .upsert(rows, { onConflict: "url", ignoreDuplicates: true });
  if (error) throw new Error(`Supabase upsert seen_social failed: ${error.message}`);
}

export async function markWebSeen(results: ClassifiedWebResult[]): Promise<void> {
  if (results.length === 0) return;
  const rows = results.map((r) => ({ url: r.url, brand: r.brand satisfies Brand }));
  const { error } = await supabase
    .from("seen_web")
    .upsert(rows, { onConflict: "url", ignoreDuplicates: true });
  if (error) throw new Error(`Supabase upsert seen_web failed: ${error.message}`);
}
