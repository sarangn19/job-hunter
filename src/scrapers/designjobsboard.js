// src/scrapers/designjobsboard.js
const { getText, load } = require('./http');

async function scrape() {
  const jobs = [];
  const urls = [
    'https://designjobsboard.com/',
    'https://designjobsboard.com/?s=ux',
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
        if (!/job|position|designer|ux|ui/i.test(href + ' ' + title)) return;
        if (!/ux|ui|product design|designer/i.test(title)) return;
        const full = href.startsWith('http') ? href : 'https://designjobsboard.com' + href;
        jobs.push({ source: 'Design Jobs Board', title, company: '', location: '', url: full, description: '' });
      });
    } catch (e) { console.error('Design Jobs Board error:', e.message); }
  }
  const seen = new Set();
  return jobs.filter(j => (seen.has(j.url) ? false : (seen.add(j.url), true)));
}

module.exports = { name: 'Design Jobs Board', scrape };
