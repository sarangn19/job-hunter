// src/scrapers/cyberpark.js
const { getText, load } = require('./http');

async function scrape() {
  const jobs = [];
  const urls = [
    'https://cyberparks.in/',
    'https://cyberparks.in/careers/',
  ];
  for (const url of urls) {
    try {
      const html = await getText(url);
      const $ = load(html);
      $('a').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href') || '';
        const title = $el.text().replace(/\s+/g,' ').trim();
        if (!title || title.length < 6) return;
        if (!/job|career|hiring|vacanc|design|ux|ui/i.test(title + ' ' + href)) return;
        const full = href.startsWith('http') ? href : 'https://cyberparks.in' + href;
        jobs.push({ source: 'Cyberpark', title, company: '', location: 'Kerala, India', url: full, description: '' });
      });
    } catch (e) { console.error('Cyberpark error:', e.message); }
  }
  const seen = new Set();
  return jobs.filter(j => (seen.has(j.url) ? false : (seen.add(j.url), true)));
}

module.exports = { name: 'Cyberpark', scrape };
