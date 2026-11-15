// src/scrapers/http.js - fetch helpers
const cheerio = require('cheerio');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function get(url, opts = {}) {
  const res = await global.fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      ...(opts.headers || {}),
    },
    timeout: opts.timeout || 15000,
    ...opts,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res;
}

async function getText(url, opts = {}) {
  const res = await get(url, opts);
  return res.text();
}

async function getJson(url, opts = {}) {
  const res = await get(url, { headers: { Accept: 'application/json', ...(opts.headers || {}) }, ...opts });
  return res.json();
}

function load(html) { return cheerio.load(html); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function withRetry(fn, retries = 2, delay = 1500) {
  let last;
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); } catch (e) { last = e; if (i < retries) await sleep(delay * (i + 1)); }
  }
  throw last;
}

module.exports = { get, getText, getJson, load, sleep, withRetry, UA };
