// src/scrapers/index.js - registry of all sources
const list = [
  require('./uxjobsboard'),
  require('./dribbble'),
  require('./behance'),
  require('./designjobsboard'),
  require('./productdesignjobs'),
  require('./weworkremotely'),
  require('./remoteco'),
  require('./flexjobs'),
  require('./wellfound'),
  require('./builtin'),
  require('./linkedin'),
  require('./glassdoor'),
  require('./simplify'),
  require('./toptal'),
  require('./braintrust'),
  require('./upwork'),
  require('./infopark'),
  require('./cyberpark'),
];

const SOURCES = list.map(s => s.name);

async function runAll({ onSource } = {}) {
  const results = { jobs: [], errors: [] };
  await Promise.allSettled(list.map(async (scraper) => {
    try {
      const jobs = await Promise.race([
        scraper.scrape(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 20000)),
      ]);
      const clean = (v) => (v == null ? '' : String(v).replace(/\s+/g, ' ').trim());
      const tagged = (jobs || []).map(j => ({
        source: j.source || scraper.name,
        title: clean(j.title),
        company: clean(j.company),
        location: clean(j.location),
        url: clean(j.url),
        description: clean(j.description),
        salary: clean(j.salary),
        posted_at: clean(j.posted_at),
      }));
      results.jobs.push(...tagged);
      if (onSource) onSource(scraper.name, tagged.length, null);
    } catch (e) {
      results.errors.push({ source: scraper.name, error: e.message });
      if (onSource) onSource(scraper.name, 0, e.message);
    }
  }));
  return results;
}

module.exports = { SOURCES, runAll, list };
