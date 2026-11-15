// src/routes.js - REST API
const express = require('express');
const db = require('./db');
const { runScan } = require('./scheduler');
const { SOURCES } = require('./scrapers');
const { isRelevant } = require('./filters');

const router = express.Router();

router.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

router.get('/api/sources', (req, res) => res.json({ sources: SOURCES }));

router.get('/api/jobs', async (req, res) => {
  const { source, newOnly, limit, since } = req.query;
  const jobs = await db.listJobs({ source: source || undefined, isNew: newOnly === '1' ? true : (newOnly === '0' ? false : undefined), limit: Number(limit) || 500, since });
  res.json({ count: jobs.length, jobs });
});

router.get('/api/stats', async (req, res) => res.json(await db.stats()));

router.get('/api/scans', async (req, res) => res.json({ scans: await db.recentScans(Number(req.query.limit) || 50) }));

router.post('/api/scan', async (req, res) => {
  runScan().catch(e => console.error(e));
  res.json({ started: true });
});

router.post('/api/jobs/read', async (req, res) => {
  await db.markAllRead();
  res.json({ ok: true });
});

router.get('/api/settings', async (req, res) => {
  const keys = ['smtp_host','smtp_port','smtp_secure','smtp_user','smtp_from','email_to','webhook_url','cron'];
  const out = {};
  for (const k of keys) out[k] = await db.getSetting(k);
  res.json(out);
});

router.post('/api/settings', async (req, res) => {
  for (const [k, v] of Object.entries(req.body || {})) await db.setSetting(k, v);
  res.json({ ok: true });
});

router.post('/api/test-filter', (req, res) => {
  const job = req.body || {};
  res.json({ relevant: isRelevant(job) });
});

module.exports = router;
