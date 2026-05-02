import type { ClassifiedWebResult } from "../types.js";
import { escapeHtml, shellHtml } from "./shared.js";

interface WebDigest {
  subject: string;
  html: string;
  isEmpty: boolean;
}

const RELEVANCE_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

export function buildWebDigest(results: ClassifiedWebResult[], date: string): WebDigest {
  const competitive = results
    .filter((r) => r.classification.category === "competitive_move")
    .sort((a, b) => RELEVANCE_RANK[b.classification.strategic_relevance] - RELEVANCE_RANK[a.classification.strategic_relevance]);

  const complaints = results.filter((r) => r.classification.category === "complaint_pattern");

  const narrative = results
    .filter((r) => r.classification.category === "narrative")
    .sort((a, b) => RELEVANCE_RANK[b.classification.strategic_relevance] - RELEVANCE_RANK[a.classification.strategic_relevance]);

  const isEmpty = competitive.length === 0 && complaints.length === 0 && narrative.length === 0;

  const subject = `Web digest · ${date} · ${competitive.length} moves, ${complaints.length} complaints, ${narrative.length} narrative`;

  const sections: string[] = [];

  if (narrative.length > 0) {
    sections.push(section("📰 This week's narrative", narrative.map(row).join("")));
  }
  if (competitive.length > 0) {
    sections.push(section("🏢 Competitive moves", competitive.map(row).join("")));
  }
  if (complaints.length > 0) {
    sections.push(section("💢 Complaint patterns", complaints.map(row).join("")));
  }

  return { subject, html: shellHtml(subject, sections.join("")), isEmpty };
}

function section(title: string, rowsHtml: string): string {
  return `<h2 style="font-size: 16px; margin: 24px 0 8px; border-bottom: 1px solid #eee; padding-bottom: 4px;">${title}</h2>${rowsHtml}`;
}

function sourceTag(t: string): string {
  return t.toUpperCase();
}

function row(r: ClassifiedWebResult): string {
  const c = r.classification;
  return `<div style="margin: 12px 0; padding: 12px; border: 1px solid #eee; border-radius: 6px;">
  <div style="font-size: 12px; color: #888;">
    ${sourceTag(c.source_type)} · brand: ${escapeHtml(r.brand)} · relevance: ${escapeHtml(c.strategic_relevance)} · sentiment: ${escapeHtml(c.sentiment)}
  </div>
  <div style="font-size: 14px; font-weight: 600; margin: 4px 0;">${escapeHtml(r.title)}</div>
  <div style="font-size: 14px; margin: 6px 0;">${escapeHtml(c.takeaway)}</div>
  <a href="${escapeHtml(r.url)}" style="font-size: 13px;">${escapeHtml(r.url)}</a>
</div>`;
}
