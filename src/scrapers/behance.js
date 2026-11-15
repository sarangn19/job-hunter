// src/scrapers/behance.js
const { getText, load } = require('./http');

async function scrape() {
  const jobs = [];
  const urls = [
    'https://www.behance.net/joblist?search=ux+designer',
    'https://www.behance.net/joblist?search=product+designer',
  ];
  for (const url of urls) {
    try {
      const html = await getText(url);
      const $ = load(html);
      $('a[href*="/joblist/"], a[href*="job"]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const title = $el.text().trim();
        if (!title || title.length < 4) return;
        const full = href.startsWith('http') ? href : 'https://www.behance.net' + href;
        if (!/ux|ui|product design|designer/i.test(title)) return;
        jobs.push({ source: 'Behance Job List', title, company: '', location: '', url: full, description: '' });
      });
    } catch (e) { console.error('Behance error:', e.message); }
  }
  const seen = new Set();
  return jobs.filter(j => (seen.has(j.url) ? false : (seen.add(j.url), true)));
}

module.exports = { name: 'Behance Job List', scrape };
