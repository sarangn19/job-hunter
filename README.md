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

## Notes

- LinkedIn/remote boards may rate-limit; increase intervals if needed.
- FlexJobs/Wellfound require accounts for full listings — paste session cookies or API keys via settings if you extend the adapters.
