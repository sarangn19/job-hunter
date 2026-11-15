// src/scan-once.js - run a single scan from CLI
require('./db');
const { runScan } = require('./scheduler');
runScan().then(r => { console.log('Result:', r && r.newCount, 'new jobs'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });
