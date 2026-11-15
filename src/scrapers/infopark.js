// src/scrapers/infopark.js
const { getText, load } = require('./http');

async function scrape() {
  const jobs = [];
  let page = 1;
  while (page <= 25) {
    try {
      const html = await getText(`https://infopark.in/companies-job?page=${page}`);
      const $ = load(html);
      const rows = $('tr').toArray().filter(tr => $(tr).find('a[href*="company-jobs/details"]').length);
      if (!rows.length) break;
      for (const tr of rows) {
        const $tr = $(tr);
        const tds = $tr.find('td');
        // title usually 2nd td with class head
        let title = '';
        $tr.find('td.head').each((i, el) => {
          const txt = $(el).text().trim();
          if (txt && !/^\d{2}-\d{2}-\d{4}$/.test(txt)) title = txt;
        });
        const company = $tr.find('td.date').first().text().trim();
        const posted = $tr.find('td.head').first().text().trim();
        const href = $tr.find('a[href*="company-jobs/details"]').first().attr('href');
        if (!title || !href) continue;
        jobs.push({
          source: 'Infopark Technopark',
          title,
          company,
          location: 'Kerala, India',
          url: href,
          description: '',
          posted_at: posted,
        });
      }
      page++;
    } catch (e) { console.error('Infopark error:', e.message); break; }
  }
  const seen = new Set();
  return jobs.filter(j => (seen.has(j.url) ? false : (seen.add(j.url), true)));
}

module.exports = { name: 'Infopark Technopark', scrape };
