// src/scrapers/builtin.js
const { getText, load } = require('./http');

async function scrape() {
  const jobs = [];
  const urls = [
    'https://builtin.com/jobs?search=ux+designer',
    'https://builtin.com/jobs?search=product+designer',
  ];
  for (const url of urls) {
    try {
      const html = await getText(url);
      const $ = load(html);
      $('a[href*="/job/"]').each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        if (!href || !/\/job\//.test(href)) return;
        const title = $el.text().replace(/\s+/g,' ').trim();
        if (!title || title.length < 4) return;
        // walk up to card
        const card = $el.closest('[class*="job-bounded"], [class*="tile"], article, li, div');
        const cardText = card.text().replace(/\s+/g,' ').trim();
        // company: text before title in card
        let company = '';
        const idx = cardText.indexOf(title);
        if (idx > 0) company = cardText.slice(0, idx).trim().split(/\s{2,}/).pop() || '';
        // location: after title maybe "Hybrid Phoenix, AZ, USA"
        let location = '';
        const after = cardText.slice(idx + title.length);
        const locMatch = after.match(/(Remote|Hybrid|Onsite|[A-Z][a-zA-Z]+,\s*[A-Z]{2})/);
        if (locMatch) location = locMatch[0];
        const full = href.startsWith('http') ? href : 'https://builtin.com' + href;
        jobs.push({ source: 'Built In', title, company, location, url: full.split('?')[0], description: cardText.slice(0, 400) });
      });
    } catch (e) { console.error('Built In error:', e.message); }
  }
  const seen = new Set();
  return jobs.filter(j => (seen.has(j.url) ? false : (seen.add(j.url), true)));
}

module.exports = { name: 'Built In', scrape };
