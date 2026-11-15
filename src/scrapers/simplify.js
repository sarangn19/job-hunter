// src/scrapers/simplify.js
const { getText, load } = require('./http');

async function scrape() {
  const jobs = [];
  const urls = [
    'https://simplify.jobs/search?query=ux+designer',
    'https://simplify.jobs/search?query=product+designer',
  ];
  for (const url of urls) {
    try {
      const html = await getText(url);
      const $ = load(html);
      $('a[href*="/jobs/"]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const title = $el.text().trim();
        if (!title || title.length < 4) return;
        const full = href.startsWith('http') ? href : 'https://simplify.jobs' + href;
        jobs.push({ source: 'Simplify.jobs', title, company: '', location: '', url: full, description: '' });
      });
    } catch (e) { console.error('Simplify error:', e.message); }
  }
  const seen = new Set();
  return jobs.filter(j => (seen.has(j.url) ? false : (seen.add(j.url), true)));
}

module.exports = { name: 'Simplify.jobs', scrape };
