import { ensureSchema } from "./bootstrap.js";
import { filterUnseenSocial, filterUnseenWeb, markSocialSeen, markWebSeen } from "./db.js";
import { buildSocialDigest } from "./digests/social.js";
import { buildStatusEmail, prependStatusBlocks, type StatusBlock } from "./digests/status.js";
import { buildWebDigest } from "./digests/web.js";
import { sendEmail } from "./email.js";
import { classifySocial, classifyWeb } from "./filter.js";
import { fetchInstagram } from "./sources/apify/instagram.js";
import { fetchTikTok } from "./sources/apify/tiktok.js";
import { fetchTwitter } from "./sources/apify/twitter.js";
import { fetchWeb } from "./sources/parallel.js";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface SourceFailure {
  source: string;
  error: unknown;
}

interface SourceCount {
  source: string;
  count: number;
}

function formatErrorSummary(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === "object" && error !== null) {
    const name = "name" in error && typeof error.name === "string" ? error.name : "Error";
    const message =
      "message" in error && typeof error.message === "string" ? error.message : JSON.stringify(error);
    return `${name}: ${message}`;
  }
  return String(error);
}

function sourceFailureSuffix(failures: SourceFailure[]): string {
  if (failures.length === 0) return "";
  return ` · ${failures.length} source${failures.length === 1 ? "" : "s"} failed`;
}

function buildSourceFailureBlock(title: string, failures: SourceFailure[], intro?: string): StatusBlock {
  const lines = intro ? [intro, ...failures.map((failure) => `${failure.source}: ${formatErrorSummary(failure.error)}`)] : failures.map((failure) => `${failure.source}: ${formatErrorSummary(failure.error)}`);
  return { tone: "warning", title, lines };
}

function buildSocialSummaryBlock(sourceCounts: SourceCount[], freshCount: number, classifiedCount?: number): StatusBlock {
  const lines = sourceCounts.map(({ source, count }) => `${source}: ${count} raw posts`);
  lines.push(`${freshCount} new after dedup`);
  if (classifiedCount != null) lines.push(`${classifiedCount} classified`);
  return { tone: "info", title: "Run summary", lines };
}

function buildWebSummaryBlock(rawCount: number, freshCount: number, classifiedCount?: number): StatusBlock {
  const lines = [`${rawCount} raw results`, `${freshCount} new after dedup`];
  if (classifiedCount != null) lines.push(`${classifiedCount} classified`);
  return { tone: "info", title: "Run summary", lines };
}

export async function runSocial(): Promise<void> {
  const date = today();
  let emailSent = false;
  let freshCount = 0;
  let classifiedCount = 0;
  const sourceFailures: SourceFailure[] = [];
  const sourceCounts: SourceCount[] = [];

  console.log("[social] starting");
  try {
    const platformResults = await Promise.allSettled([fetchTikTok(), fetchInstagram(), fetchTwitter()]);
    const labels = ["tiktok", "instagram", "twitter"] as const;
    const all = platformResults.flatMap((result, i) => {
      const source = labels[i];
      if (result.status === "rejected") {
        sourceFailures.push({ source, error: result.reason });
        sourceCounts.push({ source, count: 0 });
        console.warn(`[social] ${source} fetch failed:`, result.reason);
        return [];
      }

      sourceCounts.push({ source, count: result.value.length });
      console.log(`[social] ${source}: ${result.value.length} raw posts`);
      return result.value;
    });

    if (sourceFailures.length === labels.length) {
      throw new Error("All Apify social sources failed");
    }

    const fresh = await filterUnseenSocial(all);
    freshCount = fresh.length;
    console.log(`[social] ${fresh.length} new after dedup`);
    if (fresh.length === 0) {
      const subject = `Social digest · ${date} · no new results${sourceFailureSuffix(sourceFailures)}`;
      const blocks = [
        ...(sourceFailures.length > 0
          ? [buildSourceFailureBlock("Apify source failures", sourceFailures, "The run continued with partial data.")]
          : []),
        buildSocialSummaryBlock(sourceCounts, freshCount),
      ];
      await sendEmail(
        subject,
        buildStatusEmail(subject, "The social pipeline completed, but there were no new posts to send.", blocks),
      );
      emailSent = true;
      console.log(`[social] email sent: ${subject}`);
      return;
    }

    const classified = await classifySocial(fresh);
    classifiedCount = classified.length;
    console.log(`[social] ${classified.length} classified`);

    const digest = buildSocialDigest(classified, date);
    if (digest.isEmpty) {
      const subject = `Social digest · ${date} · all noise${sourceFailureSuffix(sourceFailures)}`;
      const blocks = [
        ...(sourceFailures.length > 0
          ? [buildSourceFailureBlock("Apify source failures", sourceFailures, "The run continued with partial data.")]
          : []),
        buildSocialSummaryBlock(sourceCounts, freshCount, classifiedCount),
      ];
      await sendEmail(
        subject,
        buildStatusEmail(subject, "The social pipeline completed, but all new posts were classified as noise.", blocks),
      );
      emailSent = true;
      console.log(`[social] email sent: ${subject}`);
      await markSocialSeen(classified);
      return;
    }

    const subject = `${digest.subject}${sourceFailureSuffix(sourceFailures)}`;
    const html = prependStatusBlocks(digest.html, [
      ...(sourceFailures.length > 0
        ? [buildSourceFailureBlock("Apify source failures", sourceFailures, "The digest below was generated from the remaining sources.")]
        : []),
    ]);
    await sendEmail(subject, html);
    emailSent = true;
    console.log(`[social] email sent: ${subject}`);

    // Mark seen AFTER successful email so a crash doesn't silently swallow posts.
    await markSocialSeen(classified);
  } catch (error) {
    console.error("[social] pipeline failed:", error);
    if (!emailSent) {
      const subject = `Social digest · ${date} · failed`;
      const blocks = [
        { tone: "error" as const, title: "Run failure", lines: [formatErrorSummary(error)] },
        ...(sourceFailures.length > 0
          ? [buildSourceFailureBlock("Apify source failures", sourceFailures)]
          : []),
        ...(sourceCounts.length > 0 ? [buildSocialSummaryBlock(sourceCounts, freshCount, classifiedCount || undefined)] : []),
      ];
      await sendEmail(
        subject,
        buildStatusEmail(subject, "The social pipeline failed before it could finish building the digest.", blocks),
      );
      console.log(`[social] email sent: ${subject}`);
    }
    throw error;
  }
}

export async function runWeb(): Promise<void> {
  const date = today();
  let emailSent = false;
  let rawCount = 0;
  let freshCount = 0;
  let classifiedCount = 0;

  console.log("[web] starting");
  try {
    const raw = await fetchWeb();
    rawCount = raw.length;
    console.log(`[web] ${raw.length} raw results from Parallel`);

    const fresh = await filterUnseenWeb(raw);
    freshCount = fresh.length;
    console.log(`[web] ${fresh.length} new after dedup`);
    if (fresh.length === 0) {
      const subject = `Web digest · ${date} · no new results`;
      await sendEmail(
        subject,
        buildStatusEmail(subject, "The web pipeline completed, but there were no new results to send.", [
          buildWebSummaryBlock(rawCount, freshCount),
        ]),
      );
      emailSent = true;
      console.log(`[web] email sent: ${subject}`);
      return;
    }

    const classified = await classifyWeb(fresh);
    classifiedCount = classified.length;
    console.log(`[web] ${classified.length} classified`);

    const digest = buildWebDigest(classified, date);
    if (digest.isEmpty) {
      const subject = `Web digest · ${date} · all noise`;
      await sendEmail(
        subject,
        buildStatusEmail(subject, "The web pipeline completed, but all new results were classified as noise.", [
          buildWebSummaryBlock(rawCount, freshCount, classifiedCount),
        ]),
      );
      emailSent = true;
      console.log(`[web] email sent: ${subject}`);
      await markWebSeen(classified);
      return;
    }

    await sendEmail(digest.subject, digest.html);
    emailSent = true;
    console.log(`[web] email sent: ${digest.subject}`);

    await markWebSeen(classified);
  } catch (error) {
    console.error("[web] pipeline failed:", error);
    if (!emailSent) {
      const subject = `Web digest · ${date} · failed`;
      await sendEmail(
        subject,
        buildStatusEmail(subject, "The web pipeline failed before it could finish building the digest.", [
          { tone: "error", title: "Run failure", lines: [formatErrorSummary(error)] },
          buildWebSummaryBlock(rawCount, freshCount, classifiedCount || undefined),
        ]),
      );
      console.log(`[web] email sent: ${subject}`);
    }
    throw error;
  }
}

async function main(): Promise<void> {
  await ensureSchema();
  console.log("[bootstrap] schema ensured");

  const results = await Promise.allSettled([runSocial(), runWeb()]);
  let exitCode = 0;
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const label = i === 0 ? "social" : "web";
      console.error(`[${label}] pipeline failed:`, r.reason);
      exitCode = 1;
    }
  });
  process.exit(exitCode);
}

main().catch((error) => {
  console.error("[main] fatal startup error:", error);
  process.exit(1);
});
