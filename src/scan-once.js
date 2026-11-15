// src/scan-once.js - run a single scan from CLI
const db = require('./db');
const { runScan } = require('./scheduler');
(async () => {
  await db.init();
  const r = await runScan();
  console.log('Result:', r && r.newCount, 'new jobs');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
