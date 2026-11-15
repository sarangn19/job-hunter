// src/scrapers/upwork.js
const { getText, load } = require('./http');

async function scrape() {
  const jobs = [];
  const urls = [
    'https://www.upwork.com/nx/search/jobs/?q=ux+designer&sort=recency',
    'https://www.upwork.com/nx/search/jobs/?q=product+designer&sort=recency',
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
        if (!/ux|ui|product design|designer/i.test(title)) return;
        const full = href.startsWith('http') ? href : 'https://www.upwork.com' + href;
        jobs.push({ source: 'Upwork', title, company: '', location: 'Remote', url: full, description: '' });
      });
    } catch (e) { console.error('Upwork error:', e.message); }
  }
  const seen = new Set();
  return jobs.filter(j => (seen.has(j.url) ? false : (seen.add(j.url), true)));
}

module.exports = { name: 'Upwork', scrape };
