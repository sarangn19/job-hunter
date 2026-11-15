// src/scrapers/glassdoor.js
const { getText, load } = require('./http');

async function scrape() {
  const jobs = [];
  const urls = [
    'https://www.glassdoor.com/Job/ux-designer-jobs-SRCH_KO0,11.htm',
    'https://www.glassdoor.com/Job/product-designer-jobs-SRCH_KO0,16.htm',
  ];
  for (const url of urls) {
    try {
      const html = await getText(url);
      const $ = load(html);
      $('a[href*="/job-listing/"], a[href*="Job"]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const title = $el.text().trim();
        if (!title || title.length < 4) return;
        if (!/ux|ui|product design|designer/i.test(title)) return;
        const full = href.startsWith('http') ? href : 'https://www.glassdoor.com' + href;
        jobs.push({ source: 'Glassdoor', title, company: '', location: '', url: full, description: '' });
      });
    } catch (e) { console.error('Glassdoor error:', e.message); }
  }
  const seen = new Set();
  return jobs.filter(j => (seen.has(j.url) ? false : (seen.add(j.url), true)));
}

module.exports = { name: 'Glassdoor', scrape };
