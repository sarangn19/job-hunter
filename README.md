# Job Hunter — UI/UX & Product Designer Job Aggregator

Automatically scans 18 job boards every hour and reports new UI/UX and Product Designer openings. Runs as a small web app with a dashboard, REST API, and configurable email/webhook reporting.

## Sources

UX Jobs Board, Dribbble Jobs, Behance Job List, Design Jobs Board, Product Design Jobs, We Work Remotely, Remote.co, FlexJobs, Wellfound, Built In, LinkedIn Jobs, Glassdoor, Simplify.jobs, Toptal, Braintrust, Upwork, Infopark Technopark, Cyberpark.

> Some sources (Behance, Glassdoor, Toptal, Upwork, Wellfound, Remote.co, FlexJobs, Product Design Jobs, Cyberpark) are protected by anti-bot measures or require login; the app degrades gracefully and still collects from the open sources. Failures are logged per source and never abort a scan.

## Setup

```bash
cd "job-hunter"
npm install
npm start
```

Open http://localhost:3000. The first scan runs ~2s after startup, then every hour (cron `0 * * * *`).

One-off scan from CLI:

```bash
npm run scan
```

## Configuration (Settings page or API)

- Email reporting: set `smtp_host`, `smtp_port`, `smtp_secure`, `smtp_user`, `smtp_pass`, `smtp_from`, `email_to`.
- Webhook reporting (Slack/Discord/Telegram/etc.): set `webhook_url`.
- Schedule: set `cron` (default `0 * * * *`).
- Filter keywords: set env `JOB_KEYWORDS` (comma-separated) before start.

## How "without miss" is handled

- All sources scanned in parallel each run.
- Per-source timeouts so one slow site cannot stall the run.
- Deduplication by URL + (title, company) so the same opening is never reported twice.
- `is_new` flag + `markNotified` ensure each new opening is reported exactly once.
- Scan history recorded in SQLite for audit.

## Tech

Node.js 18+, Express, node-cron, cheerio, rss-parser, node:sqlite, nodemailer.

## Free deployment (recommended, no cost)

The most reliable free setup uses **GitHub Actions** for the hourly scan and an optional **Render free** web service for the dashboard, sharing state in a free **Neon** Postgres database.

1. Create a free database at https://neon.tech (or Supabase). Copy its connection string.
2. In your GitHub repo: Settings → Secrets and variables → Actions → add:
   - `DATABASE_URL` (the Neon connection string)
   - Reporting secrets: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `EMAIL_TO`, and/or `WEBHOOK_URL`
   - Optional: `JOB_KEYWORDS`
3. The included workflow `.github/workflows/hourly-scan.yml` runs `npm run scan` every hour, persists dedup state to `data/jobs.db` in the repo, and reports new openings. Enable it under the repo's Actions tab.
4. (Optional dashboard) Deploy to Render free using the Blueprint; set `DATABASE_URL` in Render env vars. The dashboard reads from the same Neon DB.

> Render's free web services sleep when idle; that's fine because scanning is done by GitHub Actions, not the web service. The dashboard simply wakes on visit.

## Notes

- LinkedIn/remote boards may rate-limit; increase intervals if needed.
- FlexJobs/Wellfound require accounts for full listings — paste session cookies or API keys via settings if you extend the adapters.
- The provided `DATABASE_URL` env in some environments may be invalid; create your own free Neon/Supabase database.
