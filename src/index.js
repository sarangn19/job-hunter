// src/index.js - Express server + scheduler
const express = require('express');
const path = require('path');
const db = require('./db');
const routes = require('./routes');
const { startScheduler } = require('./scheduler');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', routes);
app.use(express.static(path.join(__dirname, '..', 'public')));

async function boot() {
  await db.init();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, async () => {
    console.log(`Job Hunter running at http://localhost:${PORT}`);
    const cronExpr = (await db.getSetting('cron')) || '0 * * * *';
    startScheduler(cronExpr);
  });
}
boot().catch(e => { console.error(e); process.exit(1); });
