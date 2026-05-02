import { escapeHtml, shellHtml } from "./shared.js";

export interface StatusBlock {
  tone: "success" | "info" | "warning" | "error";
  title: string;
  lines: string[];
}

const TONE_STYLES: Record<StatusBlock["tone"], { border: string; bg: string }> = {
  success: { border: "#18794e", bg: "#eefbf3" },
  info: { border: "#1d4ed8", bg: "#eff6ff" },
  warning: { border: "#b45309", bg: "#fffbeb" },
  error: { border: "#b91c1c", bg: "#fef2f2" },
};

export function buildStatusEmail(subject: string, intro: string, blocks: StatusBlock[]): string {
  const body = `<p style="font-size: 14px; line-height: 1.5; margin: 0 0 16px;">${escapeHtml(intro)}</p>${renderBlocks(blocks)}`;
  return shellHtml(subject, body);
}

export function prependStatusBlocks(html: string, blocks: StatusBlock[]): string {
  if (blocks.length === 0) return html;
  return html.replace("</h1>", `</h1>${renderBlocks(blocks)}`);
}

function renderBlocks(blocks: StatusBlock[]): string {
  return blocks.map(renderBlock).join("");
}

function renderBlock(block: StatusBlock): string {
  const style = TONE_STYLES[block.tone];
  const items = block.lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  return `<div style="margin: 16px 0; padding: 14px 16px; border-left: 4px solid ${style.border}; background: ${style.bg}; border-radius: 6px;">
  <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">${escapeHtml(block.title)}</div>
  <ul style="margin: 0; padding-left: 18px; color: #333; font-size: 13px; line-height: 1.5;">${items}</ul>
</div>`;
}
