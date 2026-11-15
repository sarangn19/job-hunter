// src/notifier.js - reporting via email / webhook / console
const nodemailer = require('nodemailer');
const db = require('./db');

async function cfg(dbKey, envKey, def = null) {
  const v = await db.getSetting(dbKey);
  if (v != null && v !== '') return v;
  if (process.env[envKey] != null && process.env[envKey] !== '') return process.env[envKey];
  return def;
}

async function getEmailTransport() {
  const host = await cfg('smtp_host', 'SMTP_HOST');
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(await cfg('smtp_port', 'SMTP_PORT') || 587),
    secure: (await cfg('smtp_secure', 'SMTP_SECURE')) === 'true',
    auth: (await cfg('smtp_user', 'SMTP_USER')) ? { user: await cfg('smtp_user', 'SMTP_USER'), pass: await cfg('smtp_pass', 'SMTP_PASS') } : undefined,
  });
}

function formatJob(j) {
  return `• ${j.title} — ${j.company || 'Unknown company'}${j.location ? ' (' + j.location + ')' : ''}\n  ${j.url}`;
}

async function sendEmail(jobs) {
  const transport = await getEmailTransport();
  const to = await cfg('email_to', 'EMAIL_TO');
  if (!transport || !to) return { skipped: true, reason: 'email not configured' };
  const subject = `Job Hunter: ${jobs.length} new UI/UX & Product Designer opening(s)`;
  const text = jobs.map(formatJob).join('\n\n') + `\n\n— Reported by Job Hunter`;
  const from = (await cfg('smtp_from', 'SMTP_FROM')) || (await cfg('smtp_user', 'SMTP_USER'));
  await transport.sendMail({ from, to, subject, text });
  return { ok: true };
}

async function sendWebhook(jobs) {
  const url = await cfg('webhook_url', 'WEBHOOK_URL');
  if (!url) return { skipped: true, reason: 'webhook not configured' };
  const fetch = global.fetch;
  const payload = {
    text: `Job Hunter: ${jobs.length} new opening(s)\n` + jobs.map(formatJob).join('\n'),
    jobs: jobs.map(j => ({ title: j.title, company: j.company, location: j.location, url: j.url, source: j.source })),
  };
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return { ok: res.ok, status: res.status };
}

async function report(jobs) {
  if (!jobs.length) return { emailed: null, webhook: null, count: 0 };
  const results = {};
  try { results.email = await sendEmail(jobs); } catch (e) { results.email = { error: e.message }; }
  try { results.webhook = await sendWebhook(jobs); } catch (e) { results.webhook = { error: e.message }; }
  console.log(`\n===== NEW JOBS REPORT (${jobs.length}) =====`);
  for (const j of jobs) console.log(formatJob(j));
  console.log('==========================================\n');
  return results;
}

module.exports = { report, sendEmail, sendWebhook };
