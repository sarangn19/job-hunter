// src/scrapers/linkedin.js
const { getText, load } = require('./http');

async function scrape() {
  const jobs = [];
  const urls = [
    'https://www.linkedin.com/jobs/search/?keywords=ux%20designer&location=Worldwide',
    'https://www.linkedin.com/jobs/search/?keywords=product%20designer&location=Worldwide',
  ];
  for (const url of urls) {
    try {
      const html = await getText(url);
      const $ = load(html);
      // LinkedIn public job cards
      $('.base-card, .job-search-card, li').each((_, el) => {
        const $el = $(el);
        const a = $el.find('a.base-card__full-link, a[href*="/jobs/view/"]').first();
        const href = a.attr('href');
        const title = $el.find('.base-search-card__title, h3, .job-title').first().text().trim() || a.text().trim();
        const company = $el.find('.base-search-card__subtitle, h4, .company').first().text().trim();
        const location = $el.find('.job-search-card__location, .location').first().text().trim();
        if (!title || !href) return;
        const full = href.split('?')[0];
        jobs.push({ source: 'LinkedIn Jobs', title, company, location, url: full, description: '' });
      });
    } catch (e) { console.error('LinkedIn error:', e.message); }
  }
  const seen = new Set();
  return jobs.filter(j => (seen.has(j.url) ? false : (seen.add(j.url), true)));
}

module.exports = { name: 'LinkedIn Jobs', scrape };
