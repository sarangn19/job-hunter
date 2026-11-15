// src/scrapers/uxjobsboard.js
const { getText, load } = require('./http');

async function scrape() {
  const jobs = [];
  const urls = [
    'https://www.uxjobsboard.com/jobs',
    'https://www.uxjobsboard.com/jobs?search=product+designer',
  ];
  for (const url of urls) {
    try {
      const html = await getText(url);
      const $ = load(html);
      // job cards
      $('a[href*="/job/"], .job a, article a').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const title = $el.text().trim();
        if (!title || title.length < 4) return;
        const full = href.startsWith('http') ? href : 'https://www.uxjobsboard.com' + href;
        if (!/ux|ui|product design|designer/i.test(title)) return;
        jobs.push({ source: 'UX Jobs Board', title, company: '', location: '', url: full, description: '' });
      });
    } catch (e) { console.error('UX Jobs Board error:', e.message); }
  }
  const seen = new Set();
  return jobs.filter(j => (seen.has(j.url) ? false : (seen.add(j.url), true)));
}

module.exports = { name: 'UX Jobs Board', scrape };
