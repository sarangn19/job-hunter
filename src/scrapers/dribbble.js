// src/scrapers/dribbble.js
const { getText, load } = require('./http');

async function scrape() {
  const jobs = [];
  const urls = [
    'https://dribbble.com/jobs?search=ux',
    'https://dribbble.com/jobs?search=product+designer',
  ];
  for (const url of urls) {
    try {
      const html = await getText(url);
      const $ = load(html);
      $('li.job-list-item').each((_, el) => {
        const $el = $(el);
        const a = $el.find('a.job-link').first();
        const href = a.attr('href');
        const title = $el.find('.job-board-job-title, .job-title').first().text().replace(/\s+/g,' ').trim();
        const company = $el.find('.job-board-job-company').first().text().replace(/\s+/g,' ').trim();
        const location = $el.find('.location').first().text().replace(/\s+/g,' ').trim();
        if (!title || !href) return;
        const full = href.startsWith('http') ? href : 'https://dribbble.com' + href;
        jobs.push({ source: 'Dribbble Jobs', title, company, location, url: full.split('?')[0], description: '' });
      });
    } catch (e) { console.error('Dribbble error:', e.message); }
  }
  const seen = new Set();
  return jobs.filter(j => (seen.has(j.url) ? false : (seen.add(j.url), true)));
}

module.exports = { name: 'Dribbble Jobs', scrape };
