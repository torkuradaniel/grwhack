import type { ClassifiedPost } from "../types.js";
import { escapeHtml, fmtNumber, shellHtml } from "./shared.js";

interface SocialDigest {
  subject: string;
  html: string;
  isEmpty: boolean;
}

export function buildSocialDigest(posts: ClassifiedPost[], date: string): SocialDigest {
  const outreach = posts
    .filter((p) => p.classification.category === "outreach_target")
    .sort((a, b) => b.classification.outreach_score - a.classification.outreach_score);

  const viral = posts
    .filter((p) => p.classification.category === "viral_to_study")
    .sort((a, b) => b.classification.virality_score - a.classification.virality_score);

  const negative = posts
    .filter((p) => p.classification.category === "negative_signal")
    .sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));

  const isEmpty = outreach.length === 0 && viral.length === 0 && negative.length === 0;

  const subject = `Social digest · ${date} · ${outreach.length} outreach, ${viral.length} viral, ${negative.length} negative`;

  const sections: string[] = [];

  if (outreach.length > 0) {
    sections.push(section("🎯 Outreach candidates", outreach.map(outreachRow).join("")));
  }
  if (viral.length > 0) {
    sections.push(section("🔥 Viral patterns to study", viral.map(viralRow).join("")));
  }
  if (negative.length > 0) {
    sections.push(section("⚠️ Negative mentions", negative.map(negativeRow).join("")));
  }

  return { subject, html: shellHtml(subject, sections.join("")), isEmpty };
}

function platformEmoji(p: string): string {
  return p === "tiktok" ? "🎵" : p === "instagram" ? "📷" : "🐦";
}

function section(title: string, rowsHtml: string): string {
  return `<h2 style="font-size: 16px; margin: 24px 0 8px; border-bottom: 1px solid #eee; padding-bottom: 4px;">${title}</h2>${rowsHtml}`;
}

function outreachRow(p: ClassifiedPost): string {
  const c = p.classification;
  return `<div style="margin: 12px 0; padding: 12px; border: 1px solid #eee; border-radius: 6px;">
  <div style="font-size: 13px; color: #555;">
    ${platformEmoji(p.platform)} <strong>@${escapeHtml(p.authorHandle)}</strong>
    · ${fmtNumber(p.authorFollowers)} followers
    · ${fmtNumber(p.likes)} likes
    · brand: ${escapeHtml(p.brand)}
    · score <strong>${c.outreach_score}/10</strong>
  </div>
  <div style="margin: 6px 0; font-size: 14px;">${escapeHtml(c.hook)}</div>
  <div style="font-size: 13px; color: #666;">${escapeHtml(p.text.slice(0, 200))}${p.text.length > 200 ? "…" : ""}</div>
  <a href="${escapeHtml(p.url)}" style="font-size: 13px;">${escapeHtml(p.url)}</a>
</div>`;
}

function viralRow(p: ClassifiedPost): string {
  const c = p.classification;
  return `<div style="margin: 12px 0; padding: 12px; border: 1px solid #eee; border-radius: 6px;">
  <div style="font-size: 13px; color: #555;">
    ${platformEmoji(p.platform)} <strong>@${escapeHtml(p.authorHandle)}</strong>
    · ${fmtNumber(p.views)} views
    · ${fmtNumber(p.likes)} likes
    · brand: ${escapeHtml(p.brand)}
    · score <strong>${c.virality_score}/10</strong>
  </div>
  <div style="margin: 6px 0; font-size: 14px;"><em>${escapeHtml(c.hook)}</em></div>
  <div style="font-size: 13px; color: #666;">${escapeHtml(p.text.slice(0, 200))}${p.text.length > 200 ? "…" : ""}</div>
  <a href="${escapeHtml(p.url)}" style="font-size: 13px;">${escapeHtml(p.url)}</a>
</div>`;
}

function negativeRow(p: ClassifiedPost): string {
  return `<div style="margin: 8px 0; padding: 8px; border-left: 3px solid #c44; background: #fafafa;">
  <div style="font-size: 13px;">
    ${platformEmoji(p.platform)} <strong>@${escapeHtml(p.authorHandle)}</strong>
    · brand: ${escapeHtml(p.brand)}
    · ${escapeHtml(p.classification.hook)}
  </div>
  <a href="${escapeHtml(p.url)}" style="font-size: 12px;">${escapeHtml(p.url)}</a>
</div>`;
}
