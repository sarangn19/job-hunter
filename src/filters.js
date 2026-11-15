// src/filters.js - match UI/UX & Product Designer roles (title-focused)
const INCLUDE = [
  /\bux\b/i, /\bui\b/i, /product\s*design/i, /interaction\s*design/i,
  /experience\s*design/i, /visual\s*design/i, /user\s*experience/i, /user\s*interface/i,
];
const EXCLUDE_TITLE = [
  /manager/i, /engineer/i, /developer/i, /devops/i, /analyst/i, /scientist/i,
  /recruiter/i, /sales/i, /marketing/i, /writer/i, /content/i, /copywriter/i,
  /graphic\s*design/i, /motion\s*design/i, /\b3d\b/i, /interior/i, /fashion/i,
  /industrial/i, /print\s*design/i, /level\s*design/i, /sound\s*design/i,
  /game\s*design/i, /photographer/i, /illustrator/i, /editor/i, /controller/i,
  /accountant/i, /operations/i, /support/i, /qa\b/i, /tester/i, /architect/i,
  /product\s*owner/i, /product\s*manager/i, /project\s*manager/i,
  /data\b/i, /backend/i, /frontend/i, /full\s*stack/i, /database/i,
];

function textOf(job) { return [job.title, job.company, job.location, job.description].filter(Boolean).join(' '); }
function titleOf(job) { return (job.title || '').trim(); }

function isRelevant(job) {
  const title = titleOf(job);
  if (!title || title.length < 4) return false;
  // exclude junk/nav
  if (/^(clear filters|jobs|search|home|login|sign)/i.test(title)) return false;
  for (const ex of EXCLUDE_TITLE) if (ex.test(title)) return false;
  // must include a design role signal in the title
  if (!INCLUDE.some(rx => rx.test(title))) return false;
  // also reject if title has 'designer' but excluded already handled; require designer-ish? 
  // Allow "UX Designer", "UI/UX Designer", "Product Design Lead" etc.
  return true;
}

function score(job) {
  const title = (job.title || '').toLowerCase();
  let s = 0;
  if (/product\s*design/i.test(title)) s += 3;
  if (/\bux\b/i.test(title)) s += 2;
  if (/\bui\b/i.test(title)) s += 2;
  if (/senior|lead|principal|staff|head/i.test(title)) s += 1;
  if (/remote/i.test(textOf(job))) s += 1;
  return s;
}

module.exports = { isRelevant, score };
