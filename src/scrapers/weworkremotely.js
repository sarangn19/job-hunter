// src/scrapers/weworkremotely.js
const { getText } = require('./http');
const Parser = require('rss-parser');
const parser = new Parser();

const FEEDS = [
  'https://weworkremotely.com/categories/remote-design-jobs.rss',
  'https://weworkremotely.com/categories/remote-product-jobs.rss',
];

async function scrape() {
  const jobs = [];
  for (const feed of FEEDS) {
    try {
      const xml = await getText(feed);
      const parsed = await parser.parseString(xml);
      for (const item of (parsed.items || [])) {
        const title = (item.title || '').trim();
        // WWR titles often "Company: Title"
        let company = '', jobTitle = title;
        if (title.includes(':')) {
          const idx = title.indexOf(':');
          company = title.slice(0, idx).trim();
          jobTitle = title.slice(idx + 1).trim();
        }
        jobs.push({
          source: 'We Work Remotely',
          title: jobTitle,
          company,
          location: 'Remote',
          url: item.link || item.guid,
          description: item.contentSnippet || item.content || '',
          posted_at: item.pubDate || item.isoDate || '',
        });
      }
    } catch (e) { console.error('WWR feed error:', e.message); }
  }
  return jobs;
}

module.exports = { name: 'We Work Remotely', scrape };
