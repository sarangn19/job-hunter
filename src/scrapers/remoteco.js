// src/scrapers/remoteco.js
const { getText, load } = require('./http');

async function scrape() {
  const jobs = [];
  const urls = [
    'https://remote.co/remote-jobs/search/?search=ux+designer',
    'https://remote.co/remote-jobs/search/?search=product+designer',
    'https://remote.co/remote-jobs/design/',
  ];
  for (const url of urls) {
    try {
      const html = await getText(url);
      const $ = load(html);
      // Remote.co job cards
      $('a[href*="/remote-jobs/"]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const title = $el.text().trim();
        if (!title || title.length < 4) return;
        const full = href.startsWith('http') ? href : 'https://remote.co' + href;
        if (!/design|ux|ui|product/i.test(title)) return;
        jobs.push({ source: 'Remote.co', title, company: '', location: 'Remote', url: full, description: '' });
      });
    } catch (e) { console.error('Remote.co error:', e.message); }
  }
  // dedup by url
  const seen = new Set();
  return jobs.filter(j => (seen.has(j.url) ? false : (seen.add(j.url), true)));
}

module.exports = { name: 'Remote.co', scrape };
