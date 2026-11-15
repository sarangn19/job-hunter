// src/scrapers/braintrust.js
const { getText, load } = require('./http');

async function scrape() {
  const jobs = [];
  const urls = [
    'https://www.usebraintrust.com/jobs?search=ux+designer',
    'https://www.usebraintrust.com/jobs?search=product+designer',
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
        const full = href.startsWith('http') ? href : 'https://www.usebraintrust.com' + href;
        jobs.push({ source: 'Braintrust', title, company: '', location: 'Remote', url: full, description: '' });
      });
    } catch (e) { console.error('Braintrust error:', e.message); }
  }
  const seen = new Set();
  return jobs.filter(j => (seen.has(j.url) ? false : (seen.add(j.url), true)));
}

module.exports = { name: 'Braintrust', scrape };
