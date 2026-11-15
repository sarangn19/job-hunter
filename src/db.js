// src/db.js - SQLite storage for jobs & scan history (node:sqlite)
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'jobs.db');

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    title TEXT NOT NULL,
    company TEXT,
    location TEXT,
    url TEXT NOT NULL,
    description TEXT,
    salary TEXT,
    posted_at TEXT,
    found_at TEXT NOT NULL,
    is_new INTEGER DEFAULT 1,
    notified INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    status TEXT,
    total_found INTEGER DEFAULT 0,
    new_found INTEGER DEFAULT 0,
    error TEXT
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
  CREATE INDEX IF NOT EXISTS idx_jobs_found_at ON jobs(found_at);
`);

// migrations (idempotent)
try { db.exec('ALTER TABLE jobs ADD COLUMN notified INTEGER DEFAULT 0'); } catch (e) {}

function getSetting(key, def = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : def;
}
function setSetting(key, value) {
  db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, String(value));
}

function upsertJob(job) {
  const s = (v) => (v == null ? '' : String(v));
  const existing = db.prepare('SELECT id FROM jobs WHERE url = ? OR (title = ? AND company = ?)').get(s(job.url), s(job.title), s(job.company));
  if (existing) {
    db.prepare(`UPDATE jobs SET title=?, company=?, location=?, description=?, salary=?, posted_at=? WHERE id=?`)
      .run(s(job.title), s(job.company), s(job.location), s(job.description), s(job.salary), s(job.posted_at), existing.id);
    return { id: existing.id, isNew: false };
  }
  const id = job.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  db.prepare(`INSERT INTO jobs (id,source,title,company,location,url,description,salary,posted_at,found_at,is_new,notified)
              VALUES (?,?,?,?,?,?,?,?,?,?,1,0)`)
    .run(s(id), s(job.source), s(job.title), s(job.company), s(job.location), s(job.url), s(job.description), s(job.salary), s(job.posted_at), new Date().toISOString());
  return { id, isNew: true };
}

function listJobs({ source, isNew, limit = 500, since } = {}) {
  let sql = 'SELECT * FROM jobs WHERE 1=1';
  const params = [];
  if (source) { sql += ' AND source = ?'; params.push(source); }
  if (isNew != null) { sql += ' AND is_new = ?'; params.push(isNew ? 1 : 0); }
  if (since) { sql += ' AND found_at >= ?'; params.push(since); }
  sql += ' ORDER BY found_at DESC LIMIT ?';
  params.push(limit);
  return db.prepare(sql).all(...params);
}

function markNotified(ids) {
  if (!ids.length) return;
  const stmt = db.prepare('UPDATE jobs SET notified = 1, is_new = 0 WHERE id = ?');
  for (const id of ids) stmt.run(id);
}

function markAllRead() {
  db.exec('UPDATE jobs SET is_new = 0');
}

function recordScan(scan) {
  const info = db.prepare('INSERT INTO scans (started_at, finished_at, status, total_found, new_found, error) VALUES (?,?,?,?,?,?)')
    .run(scan.started_at, scan.finished_at || null, scan.status, scan.total_found || 0, scan.new_found || 0, scan.error || null);
  return info.lastInsertRowid;
}

function updateScan(id, patch) {
  const fields = [];
  const params = [];
  for (const [k, v] of Object.entries(patch)) { fields.push(`${k} = ?`); params.push(v); }
  if (!fields.length) return;
  params.push(id);
  db.prepare(`UPDATE scans SET ${fields.join(',')} WHERE id = ?`).run(...params);
}

function recentScans(limit = 50) {
  return db.prepare('SELECT * FROM scans ORDER BY id DESC LIMIT ?').all(limit);
}

function stats() {
  const total = db.prepare('SELECT COUNT(*) c FROM jobs').get().c;
  const newCount = db.prepare('SELECT COUNT(*) c FROM jobs WHERE is_new = 1').get().c;
  const bySource = db.prepare('SELECT source, COUNT(*) c FROM jobs GROUP BY source ORDER BY c DESC').all();
  const lastScan = db.prepare('SELECT * FROM scans ORDER BY id DESC LIMIT 1').get();
  return { total, newCount, bySource, lastScan };
}

module.exports = {
  db, DB_PATH, getSetting, setSetting, upsertJob, listJobs, markNotified, markAllRead,
  recordScan, updateScan, recentScans, stats,
};
