import "dotenv/config";

export const BRANDS = ["piggyvest", "cowrywise"] as const;
export type Brand = (typeof BRANDS)[number];

export const RESULTS_PER_PLATFORM = 50;
export const PARALLEL_RECENCY_DAYS = 1;

export const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL ?? "torkuradaniel@gmail.com";
export const FROM_EMAIL = process.env.FROM_EMAIL ?? "onboarding@resend.dev";

export const OPENAI_MODEL = "gpt-4o-mini";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const env = {
  apifyToken: required("APIFY_TOKEN"),
  parallelApiKey: required("PARALLEL_API_KEY"),
  openaiApiKey: required("OPENAI_API_KEY"),
  resendApiKey: required("RESEND_API_KEY"),
  supabaseUrl: required("SUPABASE_URL"),
  supabaseServiceKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  supabaseDbUrl: required("SUPABASE_DB_URL"),
};
