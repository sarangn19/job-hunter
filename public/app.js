// public/app.js
const $ = (s) => document.querySelector(s);
let allJobs = [];

async function loadStats() {
  const r = await fetch('/api/stats');
  const s = await r.json();
  $('#stats').innerHTML = `
    <div class="stat"><div class="n">${s.total}</div><div class="l">Total jobs</div></div>
    <div class="stat"><div class="n">${s.newCount}</div><div class="l">Unread new</div></div>
    <div class="stat"><div class="n">${s.bySource.length}</div><div class="l">Sources w/ jobs</div></div>
    <div class="stat"><div class="n">${s.lastScan ? new Date(s.lastScan.started_at).toLocaleTimeString() : '—'}</div><div class="l">Last scan</div></div>
  `;
  // populate source filter
  const sel = $('#sourceFilter');
  const current = sel.value;
  sel.innerHTML = '<option value="">All sources</option>' + s.bySource.map(x => `<option value="${x.source}">${x.source} (${x.c})</option>`).join('');
  sel.value = current;
}

async function loadJobs() {
  const params = new URLSearchParams();
  const src = $('#sourceFilter').value;
  if (src) params.set('source', src);
  if ($('#newOnly').checked) params.set('newOnly', '1');
  const r = await fetch('/api/jobs?' + params.toString());
  const d = await r.json();
  allJobs = d.jobs;
  renderJobs();
}

function renderJobs() {
  const q = $('#searchBox').value.toLowerCase();
  const filtered = allJobs.filter(j => !q || (j.title + ' ' + (j.company||'')).toLowerCase().includes(q));
  const container = $('#jobs');
  if (!filtered.length) { container.innerHTML = '<div class="empty">No jobs found yet. Click "Scan Now" to fetch.</div>'; return; }
  container.innerHTML = filtered.map(j => `
    <div class="job ${j.is_new ? 'new' : ''}">
      <h3>${escapeHtml(j.title)}</h3>
      <div class="meta">
        <span class="src">${escapeHtml(j.source)}</span>
        ${escapeHtml(j.company || '')} ${j.location ? '· ' + escapeHtml(j.location) : ''}
        ${j.posted_at ? '· ' + escapeHtml(j.posted_at) : ''}
      </div>
      <a href="${escapeAttr(j.url)}" target="_blank" rel="noopener">Open job ↗</a>
    </div>
  `).join('');
}

function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(s){ return escapeHtml(s); }

async function loadScans() {
  const r = await fetch('/api/scans');
  const d = await r.json();
  $('#scans').innerHTML = (d.scans || []).slice(0, 20).map(s => `
    <div class="scan-row">
      <span>${new Date(s.started_at).toLocaleString()} — ${s.status}</span>
      <span>${s.total_found} raw · ${s.new_found} new${s.error ? ' · ERR: ' + s.error : ''}</span>
    </div>
  `).join('') || '<div class="empty">No scans yet.</div>';
}

async function loadSettings() {
  const r = await fetch('/api/settings');
  const d = await r.json();
  const form = $('#settingsForm');
  for (const [k, v] of Object.entries(d)) {
    const input = form.querySelector(`[name="${k}"]`);
    if (input && v != null) input.value = v;
  }
}

$('#scanBtn').addEventListener('click', async () => {
  $('#status').textContent = 'Scan started...';
  await fetch('/api/scan', { method: 'POST' });
  setTimeout(refresh, 3000);
});
$('#markReadBtn').addEventListener('click', async () => {
  await fetch('/api/jobs/read', { method: 'POST' });
  refresh();
});
$('#sourceFilter').addEventListener('change', loadJobs);
$('#newOnly').addEventListener('change', loadJobs);
$('#searchBox').addEventListener('input', renderJobs);

$('#settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = {};
  new FormData(form).forEach((v, k) => { data[k] = v; });
  await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  alert('Settings saved');
});

async function refresh() {
  await Promise.all([loadStats(), loadJobs(), loadScans()]);
}
loadSettings();
refresh();
setInterval(refresh, 30000);
