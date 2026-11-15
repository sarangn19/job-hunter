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

$('#exportPdfBtn').addEventListener('click', exportPdf);

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

function exportPdf() {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) { alert('PDF library not loaded. Check your connection.'); return; }
  const q = $('#searchBox').value.toLowerCase();
  const src = $('#sourceFilter').value;
  const filtered = allJobs.filter(j => (!src || j.source === src) && (!q || (j.title + ' ' + (j.company||'')).toLowerCase().includes(q)));
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;
  doc.setFontSize(16);
  doc.text('Job Hunter — UI/UX & Product Designer Openings', margin, y);
  y += 22;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString()}  |  Total: ${filtered.length} jobs`, margin, y);
  y += 18;
  doc.setDrawColor(200);
  doc.line(margin, y, pageW - margin, y);
  y += 14;
  doc.setTextColor(0);
  for (const j of filtered) {
    if (y > doc.internal.pageSize.getHeight() - 80) { doc.addPage(); y = margin; }
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(j.title || '', margin, y, { maxWidth: pageW - 2*margin });
    y += 13;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80);
    const meta = [j.source, j.company, j.location].filter(Boolean).join('  •  ');
    doc.text(meta, margin, y, { maxWidth: pageW - 2*margin });
    y += 11;
    if (j.url) {
      doc.setTextColor(30, 80, 180);
      doc.text(j.url, margin, y, { maxWidth: pageW - 2*margin });
      y += 11;
    }
    doc.setTextColor(0);
    y += 6;
  }
  doc.save(`job-hunter-${new Date().toISOString().slice(0,10)}.pdf`);
}

async function refresh() {
  await Promise.all([loadStats(), loadJobs(), loadScans()]);
}
loadSettings();
refresh();
setInterval(refresh, 30000);
