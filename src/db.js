// src/db.js - storage: Postgres (if DATABASE_URL) else SQLite (node:sqlite)
const path = require('path');
const fs = require('fs');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
const USE_PG = !!DATABASE_URL;

let backend;

if (USE_PG) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false } });

  async function init() {
    await pool.query(`
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
        id SERIAL PRIMARY KEY,
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
  }

  const s = (v) => (v == null ? '' : String(v));

  backend = {
    init,
    async getSetting(key, def = null) {
      const r = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
      return r.rows[0] ? r.rows[0].value : def;
    },
    async setSetting(key, value) {
      await pool.query('INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value', [key, String(value)]);
    },
    async upsertJob(job) {
      const url = s(job.url), title = s(job.title), company = s(job.company);
      const r = await pool.query('SELECT id FROM jobs WHERE url = $1 OR (title = $2 AND company = $3)', [url, title, company]);
      if (r.rows[0]) {
        await pool.query('UPDATE jobs SET title=$1, company=$2, location=$3, description=$4, salary=$5, posted_at=$6 WHERE id=$7',
          [title, company, s(job.location), s(job.description), s(job.salary), s(job.posted_at), r.rows[0].id]);
        return { id: r.rows[0].id, isNew: false };
      }
      const id = job.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
      await pool.query(`INSERT INTO jobs (id,source,title,company,location,url,description,salary,posted_at,found_at,is_new,notified)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1,0)`,
        [s(id), s(job.source), title, company, s(job.location), url, s(job.description), s(job.salary), s(job.posted_at), new Date().toISOString()]);
      return { id, isNew: true };
    },
    async listJobs({ source, isNew, limit = 500, since } = {}) {
      const params = []; const cond = [];
      if (source) { params.push(source); cond.push(`source = $${params.length}`); }
      if (isNew != null) { params.push(isNew ? 1 : 0); cond.push(`is_new = $${params.length}`); }
      if (since) { params.push(since); cond.push(`found_at >= $${params.length}`); }
      params.push(limit);
      const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
      const r = await pool.query(`SELECT * FROM jobs ${where} ORDER BY found_at DESC LIMIT $${params.length}`, params);
      return r.rows;
    },
    async markNotified(ids) {
      if (!ids.length) return;
      for (const id of ids) await pool.query('UPDATE jobs SET notified = 1, is_new = 0 WHERE id = $1', [id]);
    },
    async markAllRead() { await pool.query('UPDATE jobs SET is_new = 0'); },
    async recordScan(scan) {
      const r = await pool.query('INSERT INTO scans (started_at, finished_at, status, total_found, new_found, error) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
        [scan.started_at, scan.finished_at || null, scan.status, scan.total_found || 0, scan.new_found || 0, scan.error || null]);
      return r.rows[0].id;
    },
    async updateScan(id, patch) {
      const fields = []; const params = [];
      for (const [k, v] of Object.entries(patch)) { params.push(v); fields.push(`${k} = $${params.length}`); }
      if (!fields.length) return;
      params.push(id);
      await pool.query(`UPDATE scans SET ${fields.join(',')} WHERE id = $${params.length}`, params);
    },
    async recentScans(limit = 50) {
      const r = await pool.query('SELECT * FROM scans ORDER BY id DESC LIMIT $1', [limit]);
      return r.rows;
    },
    async stats() {
      const total = (await pool.query('SELECT COUNT(*) c FROM jobs')).rows[0].c;
      const newCount = (await pool.query('SELECT COUNT(*) c FROM jobs WHERE is_new = 1')).rows[0].c;
      const bySource = (await pool.query('SELECT source, COUNT(*) c FROM jobs GROUP BY source ORDER BY c DESC')).rows;
      const lastScan = (await pool.query('SELECT * FROM scans ORDER BY id DESC LIMIT 1')).rows[0];
      return { total: Number(total), newCount: Number(newCount), bySource, lastScan };
    },
  };
} else {
  const { DatabaseSync } = require('node:sqlite');
  const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const DB_PATH = path.join(DATA_DIR, 'jobs.db');
  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, source TEXT NOT NULL, title TEXT NOT NULL, company TEXT, location TEXT, url TEXT NOT NULL, description TEXT, salary TEXT, posted_at TEXT, found_at TEXT NOT NULL, is_new INTEGER DEFAULT 1, notified INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS scans (id INTEGER PRIMARY KEY AUTOINCREMENT, started_at TEXT NOT NULL, finished_at TEXT, status TEXT, total_found INTEGER DEFAULT 0, new_found INTEGER DEFAULT 0, error TEXT);
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
    CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
    CREATE INDEX IF NOT EXISTS idx_jobs_found_at ON jobs(found_at);
  `);
  try { db.exec('ALTER TABLE jobs ADD COLUMN notified INTEGER DEFAULT 0'); } catch (e) {}

  const s = (v) => (v == null ? '' : String(v));

  backend = {
    async init() {},
    async getSetting(key, def = null) {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
      return row ? row.value : def;
    },
    async setSetting(key, value) {
      db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, String(value));
    },
    async upsertJob(job) {
      const existing = db.prepare('SELECT id FROM jobs WHERE url = ? OR (title = ? AND company = ?)').get(s(job.url), s(job.title), s(job.company));
      if (existing) {
        db.prepare('UPDATE jobs SET title=?, company=?, location=?, description=?, salary=?, posted_at=? WHERE id=?')
          .run(s(job.title), s(job.company), s(job.location), s(job.description), s(job.salary), s(job.posted_at), existing.id);
        return { id: existing.id, isNew: false };
      }
      const id = job.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
      db.prepare('INSERT INTO jobs (id,source,title,company,location,url,description,salary,posted_at,found_at,is_new,notified) VALUES (?,?,?,?,?,?,?,?,?,?,1,0)')
        .run(s(id), s(job.source), s(job.title), s(job.company), s(job.location), s(job.url), s(job.description), s(job.salary), s(job.posted_at), new Date().toISOString());
      return { id, isNew: true };
    },
    async listJobs({ source, isNew, limit = 500, since } = {}) {
      let sql = 'SELECT * FROM jobs WHERE 1=1'; const params = [];
      if (source) { sql += ' AND source = ?'; params.push(source); }
      if (isNew != null) { sql += ' AND is_new = ?'; params.push(isNew ? 1 : 0); }
      if (since) { sql += ' AND found_at >= ?'; params.push(since); }
      sql += ' ORDER BY found_at DESC LIMIT ?'; params.push(limit);
      return db.prepare(sql).all(...params);
    },
    async markNotified(ids) {
      if (!ids.length) return;
      const stmt = db.prepare('UPDATE jobs SET notified = 1, is_new = 0 WHERE id = ?');
      for (const id of ids) stmt.run(id);
    },
    async markAllRead() { db.exec('UPDATE jobs SET is_new = 0'); },
    async recordScan(scan) {
      const info = db.prepare('INSERT INTO scans (started_at, finished_at, status, total_found, new_found, error) VALUES (?,?,?,?,?,?)')
        .run(scan.started_at, scan.finished_at || null, scan.status, scan.total_found || 0, scan.new_found || 0, scan.error || null);
      return info.lastInsertRowid;
    },
    async updateScan(id, patch) {
      const fields = []; const params = [];
      for (const [k, v] of Object.entries(patch)) { fields.push(`${k} = ?`); params.push(v); }
      if (!fields.length) return;
      params.push(id);
      db.prepare(`UPDATE scans SET ${fields.join(',')} WHERE id = ?`).run(...params);
    },
    async recentScans(limit = 50) {
      return db.prepare('SELECT * FROM scans ORDER BY id DESC LIMIT ?').all(limit);
    },
    async stats() {
      const total = db.prepare('SELECT COUNT(*) c FROM jobs').get().c;
      const newCount = db.prepare('SELECT COUNT(*) c FROM jobs WHERE is_new = 1').get().c;
      const bySource = db.prepare('SELECT source, COUNT(*) c FROM jobs GROUP BY source ORDER BY c DESC').all();
      const lastScan = db.prepare('SELECT * FROM scans ORDER BY id DESC LIMIT 1').get();
      return { total, newCount, bySource, lastScan };
    },
  };
}

// unified exports
async function init() { if (backend.init) await backend.init(); }
module.exports = {
  init,
  getSetting: (...a) => backend.getSetting(...a),
  setSetting: (...a) => backend.setSetting(...a),
  upsertJob: (...a) => backend.upsertJob(...a),
  listJobs: (...a) => backend.listJobs(...a),
  markNotified: (...a) => backend.markNotified(...a),
  markAllRead: (...a) => backend.markAllRead(...a),
  recordScan: (...a) => backend.recordScan(...a),
  updateScan: (...a) => backend.updateScan(...a),
  recentScans: (...a) => backend.recentScans(...a),
  stats: (...a) => backend.stats(...a),
  USE_PG,
};
