// src/scrapers/flexjobs.js
const { getText, load } = require('./http');

async function scrape() {
  const jobs = [];
  // FlexJobs requires login for full listings; scrape public search previews
  const urls = [
    'https://www.flexjobs.com/search?search=ux+designer',
    'https://www.flexjobs.com/search?search=product+designer',
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
        const full = href.startsWith('http') ? href : 'https://www.flexjobs.com' + href;
        jobs.push({ source: 'FlexJobs', title, company: '', location: 'Remote', url: full, description: '' });
      });
    } catch (e) { console.error('FlexJobs error:', e.message); }
  }
  const seen = new Set();
  return jobs.filter(j => (seen.has(j.url) ? false : (seen.add(j.url), true)));
}

module.exports = { name: 'FlexJobs', scrape };
