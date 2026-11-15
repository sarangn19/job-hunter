// src/scheduler.js - hourly scan orchestration
const cron = require('node-cron');
const { runAll } = require('./scrapers');
const { isRelevant, score } = require('./filters');
const db = require('./db');
const notifier = require('./notifier');

let running = false;

async function runScan() {
  if (running) { console.log('Scan already running, skipping.'); return; }
  running = true;
  const started = new Date().toISOString();
  const scanId = db.recordScan({ started_at: started, status: 'running' });
  console.log(`[${started}] Scan started...`);
  let total = 0, newCount = 0, newJobs = [];
  try {
    const { jobs, errors } = await runAll();
    total = jobs.length;
    // filter relevant
    const relevant = jobs.filter(isRelevant);
    // upsert
    for (const j of relevant) {
      const r = db.upsertJob(j);
      if (r.isNew) {
        newCount++;
        const stored = db.listJobs({ limit: 1 }).find(x => x.id === r.id) || { ...j, id: r.id };
        newJobs.push({ ...j, id: r.id });
      }
    }
    // score sort
    newJobs.sort((a, b) => score(b) - score(a));
    db.updateScan(scanId, { finished_at: new Date().toISOString(), status: 'done', total_found: total, new_found: newCount });
    console.log(`Scan done: ${total} raw, ${relevant.length} relevant, ${newCount} new.`);
    if (errors.length) console.warn('Source errors:', errors);
    // report new jobs
    if (newJobs.length) {
      const res = await notifier.report(newJobs);
      const ids = newJobs.map(j => j.id);
      db.markNotified(ids);
      console.log('Report result:', res);
    }
  } catch (e) {
    console.error('Scan failed:', e);
    db.updateScan(scanId, { finished_at: new Date().toISOString(), status: 'error', error: e.message, total_found: total, new_found: newCount });
  } finally {
    running = false;
  }
  return { total, newCount, newJobs };
}

function startScheduler(cronExpr = '0 * * * *') {
  // run immediately on start too
  setTimeout(() => runScan().catch(console.error), 2000);
  const task = cron.schedule(cronExpr, () => runScan().catch(console.error), { scheduled: true });
  console.log(`Scheduler started: ${cronExpr} (hourly).`);
  return task;
}

module.exports = { runScan, startScheduler, isRunning: () => running };
