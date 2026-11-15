// src/notifier.js - reporting via email / webhook / console
const nodemailer = require('nodemailer');
const db = require('./db');

function getEmailTransport() {
  const host = db.getSetting('smtp_host');
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(db.getSetting('smtp_port') || 587),
    secure: db.getSetting('smtp_secure') === 'true',
    auth: db.getSetting('smtp_user') ? { user: db.getSetting('smtp_user'), pass: db.getSetting('smtp_pass') } : undefined,
  });
}

function formatJob(j) {
  return `• ${j.title} — ${j.company || 'Unknown company'}${j.location ? ' (' + j.location + ')' : ''}\n  ${j.url}`;
}

async function sendEmail(jobs) {
  const transport = getEmailTransport();
  const to = db.getSetting('email_to');
  if (!transport || !to) return { skipped: true, reason: 'email not configured' };
  const subject = `Job Hunter: ${jobs.length} new UI/UX & Product Designer opening(s)`;
  const text = jobs.map(formatJob).join('\n\n') + `\n\n— Reported by Job Hunter`;
  await transport.sendMail({ from: db.getSetting('smtp_from') || db.getSetting('smtp_user'), to, subject, text });
  return { ok: true };
}

async function sendWebhook(jobs) {
  const url = db.getSetting('webhook_url');
  if (!url) return { skipped: true, reason: 'webhook not configured' };
  const fetch = global.fetch;
  const payload = {
    text: `Job Hunter: ${jobs.length} new opening(s)\n` + jobs.map(formatJob).join('\n'),
    jobs: jobs.map(j => ({ title: j.title, company: j.company, location: j.location, url: j.url, source: j.source })),
  };
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), timeout: 15000 });
  return { ok: res.ok, status: res.status };
}

async function report(jobs) {
  if (!jobs.length) return { emailed: null, webhook: null, count: 0 };
  const results = {};
  try { results.email = await sendEmail(jobs); } catch (e) { results.email = { error: e.message }; }
  try { results.webhook = await sendWebhook(jobs); } catch (e) { results.webhook = { error: e.message }; }
  // console report always
  console.log(`\n===== NEW JOBS REPORT (${jobs.length}) =====`);
  for (const j of jobs) console.log(formatJob(j));
  console.log('==========================================\n');
  return results;
}

module.exports = { report, sendEmail, sendWebhook };
