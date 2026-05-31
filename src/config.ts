import "dotenv/config";

export const BRANDS = ["piggyvest", "cowrywise"] as const;
export type Brand = (typeof BRANDS)[number];

export const RESULTS_PER_PLATFORM = 50;
export const PARALLEL_RECENCY_DAYS = 1;

export const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL ?? "torkuradaniel@gmail.com";
export const FROM_EMAIL = process.env.FROM_EMAIL ?? "onboarding@resend.dev";

export const OPENAI_MODEL = "gpt-4o-mini";

const REQUIRED_ENV_NAMES = [
  "APIFY_TOKEN",
  "PARALLEL_API_KEY",
  "OPENAI_API_KEY",
  "RESEND_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DB_URL",
] as const;

function readRequiredEnv(): Record<(typeof REQUIRED_ENV_NAMES)[number], string> {
  const values = {} as Record<(typeof REQUIRED_ENV_NAMES)[number], string>;
  const missing: string[] = [];

  for (const name of REQUIRED_ENV_NAMES) {
    const value = process.env[name];
    if (value) {
      values[name] = value;
    } else {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required env vars: ${missing.join(", ")}. Set them in Railway service variables before the cron runs.`,
    );
  }

  return values;
}

const requiredEnv = readRequiredEnv();

export const env = {
  apifyToken: requiredEnv.APIFY_TOKEN,
  parallelApiKey: requiredEnv.PARALLEL_API_KEY,
  openaiApiKey: requiredEnv.OPENAI_API_KEY,
  resendApiKey: requiredEnv.RESEND_API_KEY,
  supabaseUrl: requiredEnv.SUPABASE_URL,
  supabaseServiceKey: requiredEnv.SUPABASE_SERVICE_ROLE_KEY,
  supabaseDbUrl: requiredEnv.SUPABASE_DB_URL,
};
