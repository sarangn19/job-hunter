// src/scrapers/productdesignjobs.js
const { getText, load } = require('./http');

async function scrape() {
  const jobs = [];
  const urls = [
    'https://www.productdesignjobs.com/',
    'https://www.productdesignjobs.com/jobs',
  ];
  for (const url of urls) {
    try {
      const html = await getText(url);
      const $ = load(html);
      $('a').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href') || '';
        const title = $el.text().trim();
        if (!title || title.length < 6) return;
        if (!/product design|ux|ui|designer/i.test(title)) return;
        const full = href.startsWith('http') ? href : 'https://www.productdesignjobs.com' + href;
        if (!/job|position/i.test(full + ' ' + href)) {
          // still allow if title matches
        }
        jobs.push({ source: 'Product Design Jobs', title, company: '', location: '', url: full, description: '' });
      });
    } catch (e) { console.error('Product Design Jobs error:', e.message); }
  }
  const seen = new Set();
  return jobs.filter(j => (seen.has(j.url) ? false : (seen.add(j.url), true)));
}

module.exports = { name: 'Product Design Jobs', scrape };
