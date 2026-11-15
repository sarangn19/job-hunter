// src/scrapers/toptal.js
const { getText, load } = require('./http');

async function scrape() {
  const jobs = [];
  const urls = [
    'https://www.toptal.com/designers',
  ];
  for (const url of urls) {
    try {
      const html = await getText(url);
      const $ = load(html);
      // Toptal is mostly marketing; try to find any job links
      $('a[href*="job"], a[href*="career"], a[href*="design"]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const title = $el.text().trim();
        if (!title || title.length < 4) return;
        if (!/ux|ui|product design|designer/i.test(title)) return;
        const full = href.startsWith('http') ? href : 'https://www.toptal.com' + href;
        jobs.push({ source: 'Toptal', title, company: 'Toptal', location: 'Remote', url: full, description: '' });
      });
    } catch (e) { console.error('Toptal error:', e.message); }
  }
  const seen = new Set();
  return jobs.filter(j => (seen.has(j.url) ? false : (seen.add(j.url), true)));
}

module.exports = { name: 'Toptal', scrape };
