# grwhack — PiggyVest & Cowrywise social listener

Daily Railway cron → scrapes TikTok / Instagram / X via Apify and the open web via Parallel → classifies with OpenAI → emails two digests via Resend.

## Setup

1. **Supabase**: create a free project. From Settings → API copy `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. From Settings → Database copy the connection string into `SUPABASE_DB_URL`. Tables are created automatically on first run.
2. **Accounts**: get keys for Apify, Parallel Web, OpenAI, Resend.
3. **Local**:
   ```bash
   cp .env.example .env   # fill in keys
   npm install
   npm start              # ensures schema, then runs both pipelines once
   ```
4. **Deploy**: push to GitHub → connect to Railway → set env vars from `.env` → Railway picks up the cron from `railway.toml`.

## Verifying the run

After `npm start`:
- Console shows raw counts per platform, dedup count, classified count.
- Two emails arrive at the configured `RECIPIENT_EMAIL` (one social, one web).
- Re-running immediately: both digests should be empty/skipped (everything deduped).

## Tuning

- Edit `src/config.ts` → `BRANDS`, `RESULTS_PER_PLATFORM`.
- Edit `src/filter.ts` → `SOCIAL_SYSTEM` / `WEB_SYSTEM` prompts to retune classification.
- Edit `src/sources/parallel.ts` → `search_queries` to retarget the web search.
