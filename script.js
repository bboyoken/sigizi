// ─── GLOBALS ────────────────────────────────────────────────────────────────
const API = 'api.php';
let currentUser = null;
let loginAttempts = 3;

// ─── UTILS ──────────────────────────────────────────────────────────────────
async function api(action, method = 'GET', body = null, params = {}) {
  let url = `${API}?action=${action}`;
  for (const [k, v] of Object.entries(params)) url += `&${k}=${encodeURIComponent(v)}`;
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  return r.json();
}

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type === 'error' ? 'error' : type === 'warning' ? 'warning' : ''}`;
  el.innerHTML = `<i class="fa fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'info-circle'}"></i><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function showAlert(id, msg, type = 'danger') {
  document.getElementById(id).innerHTML = `<div class="alert alert-${type}"><i class="fa fa-${type === 'success' ? 'check' : type === 'danger' ? 'times' : 'info'}-circle"></i>${msg}</div>`;
  setTimeout(() => { const el = document.getElementById(id); if (el) el.innerHTML = ''; }, 4000);
}

function confirm(title, msg, icon, cb) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('confirm-icon').textContent = icon;
  document.getElementById('confirm-overlay').classList.add('show');
  document.getElementById('confirm-ok').onclick = () => { cb(); closeConfirm(); };
}
function closeConfirm() { document.getElementById('confirm-overlay').classList.remove('show'); }

function openModal(title, body, footer = '', icon = '') {
  document.getElementById('modal-title').innerHTML = `${icon} ${title}`;
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal-footer').innerHTML = footer;
  document.getElementById('modal-overlay').classList.add('show');
}
function closeModal(e) {
  if (!e || e.target === document.getElementById('modal-overlay'))
    document.getElementById('modal-overlay').classList.remove('show');
}

function togglePwd(id) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function catBadge(kat) {
  const map = { 'lauk pauk': 'cat-lauk', 'cemilan': 'cat-cemilan', 'makanan utama': 'cat-utama', 'buah': 'cat-buah', 'appetizer': 'cat-appetizer' };
  const cls = map[(kat || '').toLowerCase()] || 'cat-utama';
  return `<span class="cat-badge ${cls}">${kat}</span>`;
}

function statusBadge(s) {
  const map = { 'pending': 'status-pending', 'diterima': 'status-diterima', 'ditolak': 'status-ditolak' };
  const cls = map[(s || '').toLowerCase()] || 'status-pending';
  return `<span class="status-badge ${cls}"><i class="fa fa-circle" style="font-size:.5rem"></i>${s}</span>`;
}

function kalBar(kal, max = 500) {
  const pct = Math.min(100, (kal / max) * 100);
  const col = kal > 300 ? '#ef4444' : kal > 150 ? '#f59e0b' : '#22c55e';
  return `<div class="kal-bar-wrap"><div class="kal-bar" style="width:${pct}%;background:${col}"></div></div>`;
}

// ─── AUTH SCREEN ─────────────────────────────────────────────────────────────
function switchTab(tab) {
  // Sembunyikan semua tab & form
  document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

  // Aktifkan tab yang diklik (menggunakan event.currentTarget)
  event.currentTarget.classList.add('active');

  if (tab === 'login') {
    document.getElementById('form-login').classList.add('active');
  } else if (tab === 'register') {
    document.getElementById('form-register').classList.add('active');
  } else if (tab === 'katalog-diet') {
    document.getElementById('form-katalog-diet').classList.add('active');

    // Render katalog diet ke dalam auth-screen
    const container = document.getElementById('guest-diet-container');
    container.innerHTML = '<div class="loading"><div class="spinner"></div>Memuat...</div>';

    setTimeout(() => {
      if (pageRenderers['katalog-diet']) {
        pageRenderers['katalog-diet'](container);
      } else {
        container.innerHTML = '<p>Katalog diet belum tersedia.</p>';
      }
    }, 50);
  }
}

function renderAttempts() {
  const wrap = document.getElementById('attempts-dots');
  wrap.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const d = document.createElement('div');
    d.className = 'attempt-dot' + (i >= loginAttempts ? ' used' : '');
    wrap.appendChild(d);
  }
}

async function doLogin() {
  const usn = document.getElementById('login-user').value.trim();
  const pass = document.getElementById('login-pass').value;
  if (!usn || !pass) { showAlert('login-alert', 'Username dan password harus diisi'); return; }
  const r = await api('login', 'POST', { username: usn, password: pass });
  if (r.success) {
    currentUser = r.user;
    initApp();
  } else {
    loginAttempts--;
    renderAttempts();
    if (loginAttempts <= 0) {
      showAlert('login-alert', 'Percobaan habis! Silakan daftar akun baru.', 'warning');
      setTimeout(() => switchTab('register'), 1500);
      loginAttempts = 3;
    } else {
      showAlert('login-alert', r.message + ` (Sisa: ${loginAttempts} percobaan)`);
    }
  }
}

async function doRegister() {
  const usn = document.getElementById('reg-user').value.trim();
  const p1 = document.getElementById('reg-pass').value;
  const p2 = document.getElementById('reg-pass2').value;
  if (!usn || !p1) { showAlert('reg-alert', 'Semua field wajib diisi'); return; }
  if (p1 !== p2) { showAlert('reg-alert', 'Konfirmasi password tidak cocok'); return; }
  const r = await api('register', 'POST', { username: usn, password: p1 });
  if (r.success) {
    showAlert('reg-alert', r.message, 'success');
    setTimeout(() => switchTab('login'), 1500);
  } else {
    showAlert('reg-alert', r.message);
  }
}

document.getElementById('login-pass').addEventListener('keydown', e => e.key === 'Enter' && doLogin());
document.getElementById('reg-pass2').addEventListener('keydown', e => e.key === 'Enter' && doRegister());

// ─── APP INIT ─────────────────────────────────────────────────────────────────
function initApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('sb-name').textContent = currentUser.username;
  document.getElementById('sb-role').textContent = currentUser.role === 'admin' ? '👑 Administrator' : '👤 User';
  document.getElementById('sb-avatar').textContent = currentUser.username[0].toUpperCase();
  document.getElementById('topbar-user').textContent = currentUser.username;
  document.getElementById('topbar-role').textContent = currentUser.role;
  renderNav();
  navigateTo(currentUser.role === 'admin' ? 'dashboard-admin' : 'katalog-gizi');
}

async function doLogout() {
  await api('logout', 'POST');
  currentUser = null;
  loginAttempts = 3;
  renderAttempts();
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
}

// ─── NAV ──────────────────────────────────────────────────────────────────────
const userNav = [
  { id: 'katalog-gizi', icon: 'fa-bowl-food', label: 'Katalog Gizi' },
  { id: 'kalkulator', icon: 'fa-calculator', label: 'Kalkulator' },
  { id: 'kalkulator-abdi', icon: 'fa-user-tie', label: 'Kalkulator Abdi Negara' },
  { id: 'request-user', icon: 'fa-paper-plane', label: 'Request Makanan' },
];
const adminNav = [
  { section: 'Dashboard' },
  { id: 'dashboard-admin', icon: 'fa-chart-pie', label: 'Overview' },
  { section: 'Manajemen Data' },
  { id: 'makanan-admin', icon: 'fa-utensils', label: 'Data Makanan' },
  { id: 'request-admin', icon: 'fa-clipboard-list', label: 'Request User' },
  { id: 'rekomendasi-admin', icon: 'fa-star', label: 'Rekomendasi Diet' },
  { section: 'Monitoring' },
  { id: 'log-admin', icon: 'fa-history', label: 'Log Aktivitas' },
  { id: 'user-admin', icon: 'fa-users', label: 'Data Pengguna' },
];

function renderNav() {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = '';

  // Pilih menu berdasarkan role
  const items = currentUser.role === 'admin' ? adminNav : userNav;

  items.forEach(item => {
    // Jika ini adalah header section (seperti "Manajemen Data")
    if (item.section) {
      const sectionEl = document.createElement('div');
      sectionEl.className = 'nav-section';
      sectionEl.textContent = item.section;
      nav.appendChild(sectionEl);
    }
    // Jika ini adalah menu yang bisa diklik
    else if (item.id) {
      const el = document.createElement('div');
      el.className = 'nav-item';

      // PERBAIKAN: Pastikan ID diset dengan benar
      el.id = `nav-${item.id}`;
      el.innerHTML = `<i class="fa ${item.icon}"></i><span>${item.label}</span>`;

      // Saat diklik, panggil navigateTo dengan ID menu tersebut
      el.onclick = () => navigateTo(item.id);

      nav.appendChild(el);
    }
  });
}

function navigateTo(page) {
  // 1. Update status aktif di menu samping (sidebar)
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.getElementById(`nav-${page}`);
  if (navEl) navEl.classList.add('active');

  // 2. Daftar judul halaman
  const titles = {
    'dashboard-admin': 'Dashboard Admin',
    'makanan-admin': 'Manajemen Makanan',
    'request-admin': 'Konfirmasi Request',
    'rekomendasi-admin': 'Manajemen Rekomendasi',
    'log-admin': 'Log Aktivitas',
    'user-admin': 'Data Pengguna',
    'katalog-gizi': 'Katalog Gizi',
    'kalkulator': 'Kalkulator Gizi',
    'katalog-diet': 'Katalog Diet',
    'request-user': 'Request Makanan',
    'kalkulator-abdi': 'Kalkulator Abdi Negara',
  };
  document.getElementById('topbar-title').textContent = titles[page] || page;

  // Tutup sidebar otomatis di mode HP setelah menu diklik
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('active');
  }

  // 3. Muat (Render) halaman
  const area = document.getElementById('content-area');
  area.innerHTML = '<div class="loading"><div class="spinner"></div>Memuat...</div>';

  // Pastikan renderers dipanggil. Jika halaman tidak ada di object, munculkan error
  setTimeout(() => {
    if (pageRenderers[page]) {
      pageRenderers[page](area);
    } else {
      area.innerHTML = `<div class="empty-state">
            <div class="empty-icon">⚠️</div>
            <div class="empty-title">Halaman belum tersedia</div>
            <p>Halaman untuk menu "${page}" belum dibuat.</p>
        </div>`;
    }
  }, 80);
}

// ─── PAGE RENDERERS ───────────────────────────────────────────────────────────
const pageRenderers = {

  // ── DASHBOARD ADMIN ──────────────────────────────────────────────────────
  'dashboard-admin': async (el) => {
    const stats = await api('get_stats');
    const d = stats.data || {};
    el.innerHTML = `
      <div class="page-header"><h2><i class="fa fa-chart-pie" style="color:var(--g3)"></i>Dashboard Admin</h2><p>Ringkasan sistem SIGIZI</p></div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon" style="background:#dcfce7;color:var(--g3)"><i class="fa fa-utensils"></i></div><div><div class="stat-value">${d.totalMakanan || 0}</div><div class="stat-label">Total Makanan</div></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#dbeafe;color:var(--info)"><i class="fa fa-users"></i></div><div><div class="stat-value">${d.totalUsers || 0}</div><div class="stat-label">Total User</div></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#fef3c7;color:#d97706"><i class="fa fa-clipboard-list"></i></div><div><div class="stat-value">${d.totalReq || 0}</div><div class="stat-label">Request Pending</div></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#ede9fe;color:#7c3aed"><i class="fa fa-history"></i></div><div><div class="stat-value">${d.totalLogs || 0}</div><div class="stat-label">Total Log</div></div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="card">
          <div class="card-header"><div class="card-title"><div class="card-icon icon-green"><i class="fa fa-clock"></i></div>Request Terbaru</div></div>
          <div id="req-preview"><div class="loading"><div class="spinner"></div></div></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title"><div class="card-icon icon-blue"><i class="fa fa-history"></i></div>Log Terbaru</div></div>
          <div id="log-preview"><div class="loading"><div class="spinner"></div></div></div>
        </div>
      </div>`;
    // Load previews
    const req = await api('get_requests');
    const pending = (req.data || []).filter(r => r.status_request === 'Pending').slice(0, 4);
    document.getElementById('req-preview').innerHTML = pending.length ? pending.map(r => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
        <div><div style="font-weight:600;font-size:.88rem">${r.nama_makanan_req}</div><div style="font-size:.75rem;color:var(--muted)">oleh ${r.username}</div></div>
        ${statusBadge(r.status_request)}
      </div>`).join('') : '<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-title">Tidak ada request pending</div></div>';
    const logs = await api('get_logs');
    document.getElementById('log-preview').innerHTML = (logs.data || []).slice(0, 4).map(l => `
      <div style="padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="font-size:.83rem;color:var(--text)">${l.aktivitas}</div>
        <div style="font-size:.72rem;color:var(--muted);margin-top:3px"><i class="fa fa-user"></i> ${l.username} · ${l.waktu}</div>
      </div>`).join('') || '<p style="color:var(--muted);text-align:center;padding:20px">Belum ada log</p>';
  },

  // ── KATALOG GIZI ─────────────────────────────────────────────────────────
  'katalog-gizi': async (el) => {
    const render = async (sort = 'id_makanan', dir = 'ASC', q = '') => {
      let data;
      if (q) {
        data = await api('search_makanan', 'GET', null, { q, by: 'nama' });
      } else {
        data = await api('get_makanan', 'GET', null, { sort, dir });
      }
      const rows = data.data || [];
      document.getElementById('gizi-body').innerHTML = rows.length ? rows.map((r, i) => `
        <tr>
          <td class="td-center">${i + 1}</td>
          <td><strong>${r.nama_makanan}</strong></td>
          <td>${catBadge(r.kategori)}</td>
          <td class="td-num">${parseFloat(r.kalori).toFixed(1)}</td>
          <td>${kalBar(r.kalori)}</td>
          <td class="td-num">${parseFloat(r.protein).toFixed(1)}</td>
          <td class="td-num">${parseFloat(r.karbohidrat).toFixed(1)}</td>
          <td class="td-num">${parseFloat(r.lemak).toFixed(1)}</td>
        </tr>`).join('') : `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--muted)">Tidak ada data ditemukan</td></tr>`;
    };

    el.innerHTML = `
      <div class="page-header"><h2><i class="fa fa-bowl-food" style="color:var(--g3)"></i>Katalog Gizi Makanan</h2><p>Data gizi makanan tersedia dalam database</p></div>
      <div class="card">
        <div class="toolbar">
          <div class="search-wrap"><i class="fa fa-search"></i><input class="search-input" id="gizi-search" placeholder="Cari nama makanan..." oninput="gzSearch(this.value)"/></div>
          <select class="form-input form-select" id="sort-by" style="width:auto;padding:9px 38px 9px 14px" onchange="gzSort()">
            <option value="id_makanan">Urut: Default</option>
            <option value="nama_makanan">Urut: Nama (A-Z)</option>
            <option value="kategori">Urut: Kategori</option>
            <option value="kalori">Urut: Kalori Tertinggi</option>
            <option value="protein">Urut: Protein Tertinggi</option>
          </select>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th class="td-center">No</th><th>Nama Makanan</th><th>Kategori</th><th>Kalori</th><th>Bar</th><th>Protein</th><th>Karbo</th><th>Lemak</th></tr></thead>
            <tbody id="gizi-body"><tr><td colspan="8" style="text-align:center;padding:30px"><div class="spinner" style="margin:auto"></div></td></tr></tbody>
          </table>
        </div>
      </div>`;
    await render();

    window.gzSort = async () => {
      const s = document.getElementById('sort-by').value;
      // PERBAIKAN: id_makanan sekarang juga menggunakan ASC (kecil ke besar)
      const dir = (s === 'nama_makanan' || s === 'kategori' || s === 'id_makanan') ? 'ASC' : 'DESC';
      await render(s, dir, document.getElementById('gizi-search').value);
    };
    let st;
    window.gzSearch = (v) => {
      clearTimeout(st);
      st = setTimeout(() => render('id_makanan', 'ASC', v), 350);
    };
  },

  // ── MAKANAN ADMIN ─────────────────────────────────────────────────────────
  'makanan-admin': async (el) => {
    let currentData = []; // Menyimpan data murni dari database

    // Fungsi Render Tabel + Search & Sort (Klien)
    const renderTabelMakanan = () => {
      const searchVal = document.getElementById('mk-search').value.toLowerCase();
      const sortVal = document.getElementById('mk-sort').value;

      // 1. Logika Search
      let filtered = currentData.filter(m =>
        m.nama_makanan.toLowerCase().includes(searchVal) ||
        m.kategori.toLowerCase().includes(searchVal)
      );

      // 2. Logika Sort 
      if (sortVal === 'id_makanan') {
        filtered.sort((a, b) => parseInt(a.id_makanan) - parseInt(b.id_makanan));
      } else if (sortVal === 'nama_makanan') {
        // PERBAIKAN: Tambahan sorting nama A-Z menggunakan localeCompare
        filtered.sort((a, b) => a.nama_makanan.localeCompare(b.nama_makanan));
      } else if (sortVal === 'kalori-desc') {
        filtered.sort((a, b) => parseFloat(b.kalori) - parseFloat(a.kalori));
      } else if (sortVal === 'kalori-asc') {
        filtered.sort((a, b) => parseFloat(a.kalori) - parseFloat(b.kalori));
      } else if (sortVal === 'protein-desc') {
        filtered.sort((a, b) => parseFloat(b.protein) - parseFloat(a.protein));
      }

      // 3. Render Baris (i+1 untuk Nomor Urut, r.id_makanan untuk ID Asli)
      document.getElementById('mk-body').innerHTML = filtered.length ? filtered.map((r, i) => `
        <tr>
          <td class="td-center">${i + 1}</td>
          <td class="td-center" style="color:var(--muted); font-size:0.85rem;">#${r.id_makanan}</td>
          <td><strong>${r.nama_makanan}</strong></td>
          <td>${catBadge(r.kategori)}</td>
          <td class="td-num">${parseFloat(r.kalori).toFixed(1)}</td>
          <td class="td-num">${parseFloat(r.protein).toFixed(1)}</td>
          <td class="td-num">${parseFloat(r.karbohidrat).toFixed(1)}</td>
          <td class="td-num">${parseFloat(r.lemak).toFixed(1)}</td>
          <td class="td-center">
            <button class="btn btn-warning btn-sm" onclick="editMakanan(${r.id_makanan})"><i class="fa fa-edit"></i></button>
            <button class="btn btn-danger btn-sm" onclick="delMakanan(${r.id_makanan},'${r.nama_makanan.replace(/'/g, "\\'")}')" style="margin-left:4px"><i class="fa fa-trash"></i></button>
          </td>
        </tr>`).join('') : `<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--muted)">Belum ada data</td></tr>`;
    };

    const load = async () => {
      const d = await api('get_makanan', 'GET', null, { sort: 'id_makanan', dir: 'ASC' });
      currentData = d.data || [];
      renderTabelMakanan();
    };

    el.innerHTML = `
      <div class="page-header"><h2><i class="fa fa-utensils" style="color:var(--g3)"></i>Manajemen Makanan</h2><p>CRUD data makanan gizi</p></div>
      <div class="card">
        <div class="toolbar" style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px;">
          <button class="btn btn-success btn-sm" onclick="showAddMakanan()"><i class="fa fa-plus"></i>Tambah Makanan</button>
          
          <div style="display:flex; gap:10px; align-items:center;">
            <div class="search-wrap" style="margin:0;"><i class="fa fa-search"></i><input class="search-input" id="mk-search" placeholder="Cari nama makanan..." oninput="renderTabelMakanan()"/></div>
            <select class="form-input form-select" id="mk-sort" style="width:auto;padding:9px 38px 9px 14px; margin:0;" onchange="renderTabelMakanan()">
              <option value="id_makanan">Urut: Default (ID)</option>
              <option value="nama_makanan">Urut: Nama (A-Z)</option> <option value="kalori-desc">Kalori Tertinggi</option>
              <option value="kalori-asc">Kalori Terendah</option>
              <option value="protein-desc">Protein Tertinggi</option>
            </select>
          </div>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th class="td-center">No</th><th class="td-center">ID</th><th>Nama</th><th>Kategori</th><th>Kalori</th><th>Protein</th><th>Karbo</th><th>Lemak</th><th class="td-center">Aksi</th></tr></thead>
          <tbody id="mk-body"><tr><td colspan="9" style="text-align:center;padding:30px"><div class="spinner" style="margin:auto"></div></td></tr></tbody>
        </table></div>
      </div>`;

    await load();
    window.renderTabelMakanan = renderTabelMakanan;

    const kats = ['Lauk pauk', 'Cemilan', 'Makanan utama', 'Buah', 'Appetizer'];
    const katOpts = kats.map(k => `<option value="${k}">${k}</option>`).join('');
    const mkForm = (data = {}) => `
      <div class="form-group"><label class="form-label">Nama Makanan</label><input class="form-input" id="mk-nama" value="${data.nama_makanan || ''}" placeholder="Nama makanan"/></div>
      <div class="form-group"><label class="form-label">Kategori</label><select class="form-input form-select" id="mk-kat">${katOpts.replace(`value="${data.kategori || ''}"`, `value="${data.kategori || ''}" selected`)}</select></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group"><label class="form-label">Kalori (kcal)</label><input class="form-input" id="mk-kal" type="number" step="0.1" value="${data.kalori || 0}"/></div>
        <div class="form-group"><label class="form-label">Protein (g)</label><input class="form-input" id="mk-pro" type="number" step="0.1" value="${data.protein || 0}"/></div>
        <div class="form-group"><label class="form-label">Karbohidrat (g)</label><input class="form-input" id="mk-karb" type="number" step="0.1" value="${data.karbohidrat || 0}"/></div>
        <div class="form-group"><label class="form-label">Lemak (g)</label><input class="form-input" id="mk-lem" type="number" step="0.1" value="${data.lemak || 0}"/></div>
      </div><div id="mk-alert"></div>`;

    window.showAddMakanan = () => {
      openModal('Tambah Data Makanan', mkForm(), `<button class="btn btn-outline btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-success btn-sm" onclick="saveMakanan()"><i class="fa fa-save"></i>Simpan</button>`, '<i class="fa fa-plus" style="color:var(--g3)"></i>');
    };

    window.saveMakanan = async () => {
      const payload = { nama_makanan: document.getElementById('mk-nama').value, kategori: document.getElementById('mk-kat').value, kalori: document.getElementById('mk-kal').value, protein: document.getElementById('mk-pro').value, karbohidrat: document.getElementById('mk-karb').value, lemak: document.getElementById('mk-lem').value };
      const r = await api('create_makanan', 'POST', payload);
      if (r.success) { toast(r.message); closeModal(); load(); } else showAlert('mk-alert', r.message);
    };

    window.editMakanan = async (id) => {
      const r = await api('get_makanan_by_id', 'GET', null, { id });
      if (!r.success) return;
      const d = r.data;
      openModal('Edit Data Makanan', mkForm(d), `<button class="btn btn-outline btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-warning btn-sm" onclick="updateMakanan(${id})"><i class="fa fa-save"></i>Update</button>`, '<i class="fa fa-edit" style="color:var(--accent)"></i>');
      setTimeout(() => { const sel = document.getElementById('mk-kat'); for (let o of sel.options) if (o.value === d.kategori) o.selected = true; }, 50);
    };

    window.updateMakanan = async (id) => {
      const payload = { id_makanan: id, nama_makanan: document.getElementById('mk-nama').value, kategori: document.getElementById('mk-kat').value, kalori: document.getElementById('mk-kal').value, protein: document.getElementById('mk-pro').value, karbohidrat: document.getElementById('mk-karb').value, lemak: document.getElementById('mk-lem').value };
      const r = await api('update_makanan', 'PUT', payload);
      if (r.success) { toast(r.message); closeModal(); load(); } else showAlert('mk-alert', r.message);
    };

    window.delMakanan = (id, nama) => {
      confirm('Hapus Makanan', `Yakin ingin menghapus "${nama}"? Data tidak dapat dikembalikan.`, '🗑️', async () => {
        const r = await api('delete_makanan', 'DELETE', { id });
        if (r.success) { toast(r.message); load(); } else toast(r.message, 'error');
      });
    };
  },

  // ── REQUEST USER (send) ────────────────────────────────────────────────────
  'request-user': async (el) => {
    const load = async () => {
      const d = await api('get_requests');
      document.getElementById('req-body').innerHTML = (d.data || []).length ? d.data.map(r => `
        <tr><td class="td-center">${r.id_request}</td><td><strong>${r.nama_makanan_req}</strong></td><td>${statusBadge(r.status_request)}</td></tr>`).join('') : `<tr><td colspan="3" style="text-align:center;padding:30px;color:var(--muted)">Belum ada request</td></tr>`;
    };
    el.innerHTML = `
      <div class="page-header"><h2><i class="fa fa-paper-plane" style="color:var(--g3)"></i>Request Makanan</h2><p>Ajukan request makanan baru ke admin</p></div>
      <div style="display:grid;grid-template-columns:360px 1fr;gap:20px">
        <div class="card">
          <div class="card-header"><div class="card-title"><div class="card-icon icon-green"><i class="fa fa-plus"></i></div>Ajukan Request</div></div>
          <div id="req-alert"></div>
          <div class="form-group"><label class="form-label">Nama Makanan yang Di-request</label><input class="form-input" id="req-nama" placeholder="Contoh: Gulai Kambing..."/></div>
          <button class="btn btn-primary" onclick="sendRequest()"><i class="fa fa-paper-plane"></i>Kirim Request</button>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title"><div class="card-icon icon-amber"><i class="fa fa-list"></i></div>Riwayat Request Saya</div></div>
          <div class="table-wrap"><table>
            <thead><tr><th class="td-center">ID</th><th>Nama Makanan</th><th>Status</th></tr></thead>
            <tbody id="req-body"><tr><td colspan="3" style="text-align:center"><div class="spinner" style="margin:auto"></div></td></tr></tbody>
          </table></div>
        </div>
      </div>`;
    await load();
    window.sendRequest = async () => {
      const nama = document.getElementById('req-nama').value.trim();
      if (!nama) { showAlert('req-alert', 'Nama makanan wajib diisi'); return; }
      const r = await api('create_request', 'POST', { nama_makanan_req: nama });
      if (r.success) { toast(r.message); document.getElementById('req-nama').value = ''; load(); } else showAlert('req-alert', r.message);
    };
  },

  // ── REQUEST ADMIN (confirm) ────────────────────────────────────────────────
  'request-admin': async (el) => {
    const load = async () => {
      const d = await api('get_requests');
      document.getElementById('req-admin-body').innerHTML = (d.data || []).length ? d.data.map(r => `
        <tr>
          <td class="td-center">${r.id_request}</td>
          <td>${r.username}</td>
          <td><strong>${r.nama_makanan_req}</strong></td>
          <td>${statusBadge(r.status_request)}</td>
          <td class="td-center">${r.status_request === 'Pending' ? `
            <button class="btn btn-success btn-sm" onclick="terimaReq(${r.id_request},'${r.nama_makanan_req.replace(/'/g, "\\'")}')"><i class="fa fa-check"></i>Terima</button>
            <button class="btn btn-danger btn-sm" onclick="tolakReq(${r.id_request})" style="margin-left:4px"><i class="fa fa-times"></i>Tolak</button>` : '-'}</td>
        </tr>`).join('') : `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--muted)">Tidak ada request</td></tr>`;
    };

    el.innerHTML = `
      <div class="page-header"><h2><i class="fa fa-clipboard-list" style="color:var(--g3)"></i>Konfirmasi Request User</h2><p>Terima atau tolak request makanan dari pengguna</p></div>
      <div class="card">
        <div class="table-wrap"><table>
          <thead><tr><th class="td-center">ID</th><th>Username</th><th>Nama Makanan</th><th>Status</th><th class="td-center">Aksi</th></tr></thead>
          <tbody id="req-admin-body"><tr><td colspan="5" style="text-align:center"><div class="spinner" style="margin:auto"></div></td></tr></tbody>
        </table></div>
      </div>`;
    await load();

    const kats = ['Lauk pauk', 'Cemilan', 'Makanan utama', 'Buah', 'Appetizer'];
    const katOpts = kats.map(k => `<option value="${k}">${k}</option>`).join('');

    window.terimaReq = (id, nama) => {
      openModal('Terima Request: ' + nama, `
        <div class="alert alert-info"><i class="fa fa-info-circle"></i>Lengkapi data gizi untuk <strong>${nama}</strong> sebelum menambahkan ke katalog</div>
        <div class="form-group"><label class="form-label">Kategori</label><select class="form-input form-select" id="trkat">${katOpts}</select></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div class="form-group"><label class="form-label">Kalori (kcal)</label><input class="form-input" id="trkal" type="number" step="0.1" value="0"/></div>
          <div class="form-group"><label class="form-label">Protein (g)</label><input class="form-input" id="trpro" type="number" step="0.1" value="0"/></div>
          <div class="form-group"><label class="form-label">Karbohidrat (g)</label><input class="form-input" id="trkarb" type="number" step="0.1" value="0"/></div>
          <div class="form-group"><label class="form-label">Lemak (g)</label><input class="form-input" id="trlem" type="number" step="0.1" value="0"/></div>
        </div>`,
        `<button class="btn btn-outline btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-success btn-sm" onclick="konfReq(${id},'${nama}','terima')"><i class="fa fa-check"></i>Terima & Tambahkan</button>`,
        '<i class="fa fa-check-circle" style="color:var(--g3)"></i>');
    };

    window.konfReq = async (id, nama, aksi) => {
      const payload = { id_request: id, aksi, nama_makanan_req: nama, kategori: document.getElementById('trkat')?.value, kalori: document.getElementById('trkal')?.value, protein: document.getElementById('trpro')?.value, karbohidrat: document.getElementById('trkarb')?.value, lemak: document.getElementById('trlem')?.value };
      const r = await api('konfirmasi_request', 'POST', payload);
      if (r.success) { toast(r.message); closeModal(); load(); } else toast(r.message, 'error');
    };

    window.tolakReq = (id) => {
      confirm('Tolak Request', 'Yakin ingin menolak request ini?', '❌', async () => {
        const r = await api('konfirmasi_request', 'POST', { id_request: id, aksi: 'tolak' });
        if (r.success) { toast(r.message); load(); } else toast(r.message, 'error');
      });
    };
  },

  // ── LOG ADMIN ────────────────────────────────────────────────────────────
  'log-admin': async (el) => {
    const load = async (q = '') => {
      const d = await api('get_logs', 'GET', null, { q });
      document.getElementById('log-body').innerHTML = (d.data || []).length ? d.data.map(r => `
        <tr>
          <td class="td-center">${r.id_log}</td>
          <td>${r.username}</td>
          <td>${r.aktivitas}</td>
          <td style="font-size:.78rem;color:var(--muted);white-space:nowrap">${r.waktu}</td>
        </tr>`).join('') : `<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--muted)">Tidak ada log</td></tr>`;
    };
    el.innerHTML = `
      <div class="page-header"><h2><i class="fa fa-history" style="color:var(--g3)"></i>Log Aktivitas</h2><p>Riwayat seluruh aktivitas pengguna</p></div>
      <div class="card">
        <div class="toolbar">
          <div class="search-wrap"><i class="fa fa-search"></i><input class="search-input" id="log-q" placeholder="Cari log aktivitas..." oninput="logSearch(this.value)"/></div>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th class="td-center">ID</th><th>User</th><th>Aktivitas</th><th>Waktu</th></tr></thead>
          <tbody id="log-body"><tr><td colspan="4" style="text-align:center"><div class="spinner" style="margin:auto"></div></td></tr></tbody>
        </table></div>
      </div>`;
    await load();
    let st;
    window.logSearch = (v) => { clearTimeout(st); st = setTimeout(() => load(v), 350); };
  },

  // ── USER ADMIN ────────────────────────────────────────────────────────────
  'user-admin': async (el) => {
    const load = async (q = '') => {
      const d = await api('get_users', 'GET', null, { q });
      document.getElementById('usr-body').innerHTML = (d.data || []).map(r => `
        <tr>
          <td class="td-center">${r.id}</td>
          <td><strong>${r.username}</strong></td>
          <td><span class="cat-badge ${r.role === 'admin' ? 'cat-lauk' : 'cat-utama'}">${r.role}</span></td>
        </tr>`).join('') || `<tr><td colspan="3" style="text-align:center;padding:30px;color:var(--muted)">Tidak ada data</td></tr>`;
    };
    el.innerHTML = `
      <div class="page-header"><h2><i class="fa fa-users" style="color:var(--g3)"></i>Data Pengguna</h2><p>Daftar seluruh pengguna SIGIZI</p></div>
      <div class="card">
        <div class="toolbar"><div class="search-wrap"><i class="fa fa-search"></i><input class="search-input" id="usr-q" placeholder="Cari username..." oninput="usrSearch(this.value)"/></div></div>
        <div class="table-wrap"><table>
          <thead><tr><th class="td-center">ID</th><th>Username</th><th>Role</th></tr></thead>
          <tbody id="usr-body"><tr><td colspan="3" style="text-align:center"><div class="spinner" style="margin:auto"></div></td></tr></tbody>
        </table></div>
      </div>`;
    await load();
    let st;
    window.usrSearch = (v) => { clearTimeout(st); st = setTimeout(() => load(v), 350); };
  },

  // ── REKOMENDASI ADMIN ─────────────────────────────────────────────────────
  'rekomendasi-admin': async (el) => {
    const load = async () => {
      const d = await api('get_rekomendasi');
      document.getElementById('rek-body').innerHTML = (d.data || []).map(r => `
        <tr>
          <td class="td-center">${r.id_rekomendasi}</td>
          <td><strong>${r.kategori_bmi}</strong></td>
          <td style="font-size:.85rem;line-height:1.6">${r.saran_diet}</td>
          <td class="td-center">
            <button class="btn btn-warning btn-sm" onclick="editRek(${r.id_rekomendasi},'${encodeURIComponent(r.kategori_bmi)}','${encodeURIComponent(r.saran_diet)}')"><i class="fa fa-edit"></i></button>
            <button class="btn btn-danger btn-sm" onclick="delRek(${r.id_rekomendasi})" style="margin-left:4px"><i class="fa fa-trash"></i></button>
          </td>
        </tr>`).join('') || `<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--muted)">Belum ada rekomendasi</td></tr>`;
    };

    el.innerHTML = `
      <div class="page-header"><h2><i class="fa fa-star" style="color:var(--g3)"></i>Manajemen Rekomendasi Diet</h2><p>Kelola rekomendasi diet berdasarkan kategori BMI</p></div>
      <div class="card">
        <div class="toolbar"><button class="btn btn-success btn-sm" onclick="addRek()"><i class="fa fa-plus"></i>Tambah Rekomendasi</button></div>
        <div class="table-wrap"><table>
          <thead><tr><th class="td-center">ID</th><th>Kategori BMI</th><th>Saran Diet</th><th class="td-center">Aksi</th></tr></thead>
          <tbody id="rek-body"><tr><td colspan="4" style="text-align:center"><div class="spinner" style="margin:auto"></div></td></tr></tbody>
        </table></div>
      </div>`;
    await load();
    // mbg 
    const rekForm = (kat = '', saran = '') => `
      <div class="form-group"><label class="form-label">Kategori BMI</label><input class="form-input" id="rek-kat" value="${kat}" placeholder="Contoh: Obesitas"/></div>
      <div class="form-group"><label class="form-label">Saran Diet</label><textarea class="form-input" id="rek-saran" rows="4" placeholder="Tuliskan saran diet...">${saran}</textarea></div>
      <div id="rek-alert"></div>`;

    window.addRek = () => {
      openModal('Tambah Rekomendasi', rekForm(), `<button class="btn btn-outline btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-success btn-sm" onclick="saveRek()"><i class="fa fa-save"></i>Simpan</button>`, '<i class="fa fa-plus" style="color:var(--g3)"></i>');
    };
    window.saveRek = async () => {
      const r = await api('create_rekomendasi', 'POST', { kategori_bmi: document.getElementById('rek-kat').value, saran_diet: document.getElementById('rek-saran').value });
      if (r.success) { toast(r.message); closeModal(); load(); } else showAlert('rek-alert', r.message);
    };
    window.editRek = (id, kat, saran) => {
      openModal('Edit Rekomendasi', rekForm(decodeURIComponent(kat), decodeURIComponent(saran)), `<button class="btn btn-outline btn-sm" onclick="closeModal()">Batal</button><button class="btn btn-warning btn-sm" onclick="updateRek(${id})"><i class="fa fa-save"></i>Update</button>`, '<i class="fa fa-edit" style="color:var(--accent)"></i>');
    };
    window.updateRek = async (id) => {
      const r = await api('update_rekomendasi', 'PUT', { id_rekomendasi: id, kategori_bmi: document.getElementById('rek-kat').value, saran_diet: document.getElementById('rek-saran').value });
      if (r.success) { toast(r.message); closeModal(); load(); } else showAlert('rek-alert', r.message);
    };
    window.delRek = (id) => {
      confirm('Hapus Rekomendasi', 'Yakin ingin menghapus rekomendasi ini?', '🗑️', async () => {
        const r = await api('delete_rekomendasi', 'DELETE', { id });
        if (r.success) { toast(r.message); load(); } else toast(r.message, 'error');
      });
    };
  },

  // ── KALKULATOR ────────────────────────────────────────────────────────────
  'kalkulator': async (el) => {
    el.innerHTML = `
      <div class="page-header"><h2><i class="fa fa-calculator" style="color:var(--g3)"></i>Kalkulator Gizi</h2><p>Hitung BMI dan kebutuhan kalori harian Anda</p></div>
      <div class="calc-grid">
        <!-- BMI -->
        <div class="calc-card">
          <div class="card-header"><div class="card-title"><div class="card-icon icon-green"><i class="fa fa-weight"></i></div>Kalkulator BMI</div></div>
          <div class="form-group"><label class="form-label">Berat Badan (kg)</label><input class="form-input" id="bmi-bb" type="number" min="20" max="300" placeholder="Contoh: 65"/></div>
          <div class="form-group"><label class="form-label">Tinggi Badan (cm)</label><input class="form-input" id="bmi-tb" type="number" min="100" max="250" placeholder="Contoh: 170"/></div>
          <button class="btn btn-primary" onclick="hitungBMI()"><i class="fa fa-calculator"></i>Hitung BMI</button>
          <div class="bmi-result" id="bmi-result" style="display:none">
            <div class="bmi-score" id="bmi-score"></div>
            <div class="bmi-kat" id="bmi-kat"></div>
            <div id="bmi-saran" class="bmi-saran"></div>
          </div>
        </div>
        <!-- BMR -->
        <div class="calc-card">
          <div class="card-header"><div class="card-title"><div class="card-icon icon-amber"><i class="fa fa-fire"></i></div>Kalkulator Kalori (BMR)</div></div>
          <div class="form-group">
            <label class="form-label">Jenis Kelamin</label>
            <div class="gender-toggle">
              <button class="gender-btn active" id="gen-L" onclick="setGender('L')"><i class="fa fa-mars"></i>Laki-laki</button>
              <button class="gender-btn" id="gen-P" onclick="setGender('P')"><i class="fa fa-venus"></i>Perempuan</button>
            </div>
          </div>
          <input type="hidden" id="bmr-gender" value="L"/>
          <div class="form-group"><label class="form-label">Berat Badan (kg)</label><input class="form-input" id="bmr-bb" type="number" placeholder="Contoh: 65"/></div>
          <div class="form-group"><label class="form-label">Tinggi Badan (cm)</label><input class="form-input" id="bmr-tb" type="number" placeholder="Contoh: 170"/></div>
          <div class="form-group"><label class="form-label">Umur (tahun)</label><input class="form-input" id="bmr-umur" type="number" placeholder="Contoh: 22"/></div>
          <button class="btn btn-primary" onclick="hitungBMR()"><i class="fa fa-fire"></i>Hitung Kalori</button>
          <div class="calc-result" id="bmr-result">
            <div class="calc-result-num" id="bmr-val"></div>
            <div class="calc-result-label">Kalori Dasar (BMR) Anda per hari</div>
            <div style="margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:10px" id="tdee-grid"></div>
          </div>
        </div>
      </div>`;

    window.setGender = (g) => {
      document.getElementById('bmr-gender').value = g;
      document.getElementById('gen-L').classList.toggle('active', g === 'L');
      document.getElementById('gen-P').classList.toggle('active', g === 'P');
    };

    window.hitungBMI = async () => {
      const bb = parseFloat(document.getElementById('bmi-bb').value);
      const tb = parseFloat(document.getElementById('bmi-tb').value);
      if (!bb || !tb) { toast('Isi berat dan tinggi badan', 'warning'); return; }
      const bmi = bb / ((tb / 100) ** 2);
      const score = Math.round(bmi * 10) / 10;
      let kat = '', col = '';
      if (bmi < 18.5) { kat = 'Kekurangan Berat Badan (Underweight)'; col = '#3b82f6'; }
      else if (bmi <= 24.9) { kat = 'Normal (Ideal)'; col = 'var(--g3)'; }
      else if (bmi <= 29.9) { kat = 'Kelebihan Berat Badan (Overweight)'; col = 'var(--accent)'; }
      else { kat = 'Obesitas'; col = 'var(--danger)'; }

      document.getElementById('bmi-score').textContent = score;
      document.getElementById('bmi-score').style.color = col;
      document.getElementById('bmi-kat').textContent = kat;
      document.getElementById('bmi-kat').style.color = col;

      const rec = await api('get_rekomendasi_bmi', 'GET', null, { bmi: score });
      document.getElementById('bmi-saran').innerHTML = rec.data ? `<strong><i class="fa fa-lightbulb" style="color:var(--accent)"></i> Rekomendasi Diet:</strong><br>${rec.data.saran_diet}` : 'Saran: Konsultasikan dengan ahli gizi';
      const res = document.getElementById('bmi-result');
      res.style.display = 'block'; res.classList.add('show');
    };

    window.hitungBMR = () => {
      const g = document.getElementById('bmr-gender').value;
      const bb = parseFloat(document.getElementById('bmr-bb').value);
      const tb = parseFloat(document.getElementById('bmr-tb').value);
      const u = parseInt(document.getElementById('bmr-umur').value);
      if (!bb || !tb || !u) { toast('Lengkapi semua data BMR', 'warning'); return; }
      const bmr = g === 'L'
        ? 88.362 + (13.397 * bb) + (4.799 * tb) - (5.677 * u)
        : 447.593 + (9.247 * bb) + (3.098 * tb) - (4.330 * u);
      document.getElementById('bmr-val').textContent = Math.round(bmr) + ' kkal';
      const acts = [['Sedentary (minim gerak)', 1.2], ['Ringan (1-3x/minggu)', 1.375], ['Moderat (3-5x/minggu)', 1.55], ['Aktif (6-7x/minggu)', 1.725]];
      document.getElementById('tdee-grid').innerHTML = acts.map(([lbl, fak]) => `
        <div style="background:rgba(255,255,255,.1);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:1.1rem;font-weight:700;color:var(--g4)">${Math.round(bmr * fak)}</div>
          <div style="font-size:.72rem;color:rgba(255,255,255,.65);margin-top:3px">${lbl}</div>
        </div>`).join('');
      const res = document.getElementById('bmr-result');
      res.classList.add('show'); res.style.display = 'block';
    };
  },

  // ── KALKULATOR ABDI NEGARA ────────────────────────────────────────────────
  'kalkulator-abdi': async (el) => {
    el.innerHTML = `
      <div class="page-header">
        <h2><i class="fa fa-user-tie" style="color:var(--g3)"></i> Kalkulator Abdi Negara</h2>
        <p>Cek berat badan ideal & kelayakan tinggi badan untuk menjadi Abdi Negara</p>
      </div>
      <div style="display:flex;justify-content:center;">
        <div class="calc-card" style="max-width:620px;width:100%;">
          <div class="card-header" style="margin-bottom:16px">
            <div class="card-title"><div class="card-icon icon-green"><i class="fa fa-ruler-vertical"></i></div>Kalkulator Berat Badan Ideal (Broca)</div>
          </div>

          <div class="form-group">
            <label class="form-label">Jenis Kelamin</label>
            <div class="gender-toggle">
              <button class="gender-btn active" id="abdi-gen-L" onclick="setGenderAbdi('L')"><i class="fa fa-mars"></i>Laki-laki</button>
              <button class="gender-btn" id="abdi-gen-P" onclick="setGenderAbdi('P')"><i class="fa fa-venus"></i>Perempuan</button>
            </div>
          </div>
          <input type="hidden" id="abdi-gender" value="L"/>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group">
              <label class="form-label">Tinggi Badan (cm)</label>
              <input class="form-input" id="abdi-tb" type="number" min="100" max="250" placeholder="Contoh: 170"/>
            </div>
            <div class="form-group">
              <label class="form-label">Berat Badan Saat Ini (kg)</label>
              <input class="form-input" id="abdi-bb" type="number" min="20" max="300" placeholder="Contoh: 65"/>
            </div>
          </div>

          <button class="btn btn-primary" onclick="hitungAbdi()"><i class="fa fa-calculator"></i>Hitung Kelayakan</button>
          <div id="abdi-result" style="display:none;margin-top:24px;"></div>
        </div>
      </div>`;

    window.setGenderAbdi = (g) => {
      document.getElementById('abdi-gender').value = g;
      document.getElementById('abdi-gen-L').classList.toggle('active', g === 'L');
      document.getElementById('abdi-gen-P').classList.toggle('active', g === 'P');
    };

    window.hitungAbdi = () => {
      const g = document.getElementById('abdi-gender').value;
      const tb = parseFloat(document.getElementById('abdi-tb').value);
      const bba = parseFloat(document.getElementById('abdi-bb').value);
      if (!tb || !bba) { toast('Isi semua data terlebih dahulu', 'warning'); return; }

      const minTinggi = g === 'L' ? 165 : 160;
      const labelGender = g === 'L' ? 'Laki-laki' : 'Perempuan';
      const tinggiOK = tb >= minTinggi;

      // ── Hitung BBI ──
      const bbi = Math.round((g === 'L' ? (tb - 100) * 0.9 : tb - 110) * 10) / 10;
      const bbiMin = Math.round(bbi * 0.9 * 10) / 10;
      const bbiMax = Math.round(bbi * 1.1 * 10) / 10;
      const selisih = Math.round((bba - bbi) * 10) / 10;
      const isIdeal = bba >= bbiMin && bba <= bbiMax;
      const isOver = bba > bbiMax;

      let html = '';

      // ── Blok 1: Status Tinggi ──
      if (!tinggiOK) {
        html += `<div style="background:#fef2f2;border:2px solid #fecaca;border-radius:12px;padding:20px;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
            <span style="font-size:2.2rem">📏</span>
            <div>
              <div style="font-weight:700;font-size:1rem;color:#991b1b">Tinggi Badan Belum Memenuhi Syarat Minimum</div>
              <div style="font-size:.84rem;color:#b91c1c">Tinggi Anda: <strong>${tb} cm</strong> | Minimum ${labelGender}: <strong>${minTinggi} cm</strong></div>
            </div>
          </div>
          <div style="background:#fff;border-radius:8px;padding:14px;border-left:4px solid #ef4444;">
            <strong style="color:#991b1b;display:block;margin-bottom:8px">⚠️ Saran Meningkatkan Tinggi Badan:</strong>
            <ul style="margin:0;padding-left:18px;color:#7f1d1d;font-size:.86rem;line-height:1.9;">
              <li>Konsumsi makanan kaya <strong>kalsium</strong>: susu, ikan salmon, keju, brokoli, bayam</li>
              <li>Penuhi kebutuhan <strong>Vitamin D</strong> dengan berjemur di pagi hari (06.00–08.00)</li>
              <li>Rutin berolahraga: <strong>renang, basket, lompat tali, peregangan/stretching</strong></li>
              <li>Tidur <strong>7–9 jam</strong> per malam agar hormon pertumbuhan (GH) bekerja optimal</li>
              <li>Hindari rokok, begadang, dan kafein berlebihan yang menghambat pertumbuhan</li>
              <li>Jaga postur tubuh yang tegak saat duduk, berdiri, dan berjalan</li>
            </ul>
          </div>
        </div>`;
      } else {
        html += `<div style="background:#f0fdf4;border:2px solid #bbf7d0;border-radius:12px;padding:16px;margin-bottom:16px;display:flex;align-items:center;gap:12px;">
          <span style="font-size:2rem">✅</span>
          <div>
            <div style="font-weight:700;color:#166534">Tinggi Badan Sudah Memenuhi Syarat</div>
            <div style="font-size:.84rem;color:#15803d">Tinggi Anda <strong>${tb} cm</strong> — melampaui syarat minimum <strong>${minTinggi} cm</strong> untuk ${labelGender}</div>
          </div>
        </div>`;
      }

      // ── Blok 2: Status Berat Badan ──
      let bbIcon, bbTitle, bbColor, bgCol, borderCol, saranList;
      if (isIdeal) {
        bbIcon = '⚖️'; bbTitle = 'Berat Badan IDEAL'; bbColor = '#166534'; bgCol = '#f0fdf4'; borderCol = '#bbf7d0';
        saranList = `<li>Pertahankan pola makan seimbang bergizi setiap hari</li>
          <li>Tetap aktif berolahraga minimal <strong>30 menit/hari</strong></li>
          <li>Cek kesehatan rutin agar kondisi tubuh tetap prima</li>
          <li>Konsumsi buah dan sayur beragam setiap harinya</li>`;
      } else if (isOver) {
        bbIcon = '⬆️'; bbTitle = `Berat Badan BERLEBIH (+${Math.abs(selisih)} kg dari BBI)`; bbColor = '#b45309'; bgCol = '#fef3c7'; borderCol = '#fde68a';
        saranList = `<li>Kurangi konsumsi karbohidrat sederhana: nasi putih, gula, tepung, minuman manis</li>
          <li>Perbanyak sayuran hijau, buah, dan protein tanpa lemak (ayam, ikan, tahu)</li>
          <li>Olahraga kardio rutin: <strong>jogging, bersepeda, renang</strong> minimal 30 menit/hari</li>
          <li>Minum minimal <strong>2 liter air putih</strong> per hari untuk mempercepat metabolisme</li>
          <li>Hindari makan malam setelah pukul 20.00 dan cemilan berkalori tinggi</li>`;
      } else {
        bbIcon = '⬇️'; bbTitle = `Berat Badan KURANG (${Math.abs(selisih)} kg di bawah BBI)`; bbColor = '#1d4ed8'; bgCol = '#eff6ff'; borderCol = '#bfdbfe';
        saranList = `<li>Tingkatkan asupan kalori bertahap melalui makanan bergizi padat nutrisi</li>
          <li>Konsumsi protein tinggi: <strong>daging sapi, telur, tahu, tempe, kacang-kacangan</strong></li>
          <li>Makan <strong>5–6 kali sehari</strong> dalam porsi lebih kecil tapi teratur</li>
          <li>Olahraga <strong>angkat beban</strong> ringan untuk membentuk dan menambah massa otot</li>
          <li>Konsultasi dengan ahli gizi untuk program penambahan berat badan yang aman</li>`;
      }

      html += `<div style="background:${bgCol};border:2px solid ${borderCol};border-radius:12px;padding:20px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <span style="font-size:2.2rem">${bbIcon}</span>
          <div>
            <div style="font-weight:700;font-size:1rem;color:${bbColor}">${bbTitle}</div>
            <div style="font-size:.84rem;color:var(--muted)">BBI Anda: <strong>${bbi} kg</strong> &nbsp;|&nbsp; Rentang Ideal: <strong>${bbiMin} – ${bbiMax} kg</strong></div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;">
          <div style="background:#fff;border-radius:8px;padding:12px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.07)">
            <div style="font-size:1.5rem;font-weight:700;color:var(--g3)">${bbi}</div>
            <div style="font-size:.72rem;color:var(--muted);margin-top:2px">BBI (kg)</div>
          </div>
          <div style="background:#fff;border-radius:8px;padding:12px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.07)">
            <div style="font-size:1.5rem;font-weight:700;color:var(--info)">${bba}</div>
            <div style="font-size:.72rem;color:var(--muted);margin-top:2px">BB Aktual (kg)</div>
          </div>
          <div style="background:#fff;border-radius:8px;padding:12px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.07)">
            <div style="font-size:1.5rem;font-weight:700;color:${bbColor}">${selisih > 0 ? '+' : ''}${selisih}</div>
            <div style="font-size:.72rem;color:var(--muted);margin-top:2px">Selisih (kg)</div>
          </div>
        </div>
        <div style="background:#fff;border-radius:8px;padding:14px;border-left:4px solid ${borderCol};">
          <strong style="color:${bbColor};display:block;margin-bottom:8px">💡 Saran untuk Anda:</strong>
          <ul style="margin:0;padding-left:18px;color:var(--text);font-size:.86rem;line-height:1.9;">${saranList}</ul>
        </div>
      </div>`;

      // ── Blok 3: Kesimpulan ──
      const layak = tinggiOK && isIdeal;
      html += `<div style="background:${layak ? 'linear-gradient(135deg,var(--g2),var(--g3))' : 'linear-gradient(135deg,#374151,#4b5563)'};border-radius:12px;padding:22px;text-align:center;color:#fff;">
        <div style="font-size:2.5rem;margin-bottom:8px">${layak ? '🏆' : '📋'}</div>
        <div style="font-weight:700;font-size:1.05rem;margin-bottom:6px">${layak ? 'SELAMAT! Anda Berpotensi Layak Menjadi Abdi Negara 🎉' : 'Perlu Perbaikan Sebelum Mendaftar sebagai Abdi Negara'}</div>
        <div style="font-size:.85rem;opacity:.85;line-height:1.6">${layak ? 'Tinggi dan berat badan Anda sudah memenuhi kriteria ideal. Jaga terus kondisi tubuh Anda!' : 'Perhatikan saran-saran di atas dan lakukan perbaikan secara konsisten. Kamu pasti bisa! 💪'}</div>
      </div>`;

      const resEl = document.getElementById('abdi-result');
      resEl.innerHTML = html;
      resEl.style.display = 'block';
      resEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
  },

  // ── KATALOG DIET ──────────────────────────────────────────────────────────
  'katalog-diet': async (el) => {
    const diets = [
      {
        emoji: '⏰', name: 'Intermittent Fasting', color: '#1e3a5f', short: 'Pola makan siklus puasa dan makan untuk mengoptimalkan metabolisme tubuh.',
        detail: [['Pengertian', 'Metode pengaturan pola makan yang berfokus pada siklus kapan Anda makan dan kapan Anda berpuasa.'], ['Aturan Makan', 'Populer dengan metode 16:8 (16 jam puasa, 8 jam makan). Saat puasa hanya boleh air putih, kopi/teh tanpa gula.'], ['Contoh Menu', 'Buka puasa: Dada ayam panggang, nasi merah, brokoli.\nCemilan: Buah apel segar atau segenggam almond.\nPenutup: Telur rebus dan salad sayur.'], ['Manfaat', 'Memperbaiki sensitivitas insulin.\nMembantu regenerasi sel (Autofagi).\nEfektif menurunkan berat badan.']]
      },
      {
        emoji: '🔥', name: 'Cutting', color: '#5c1a1a', short: 'Fase memangkas lemak tubuh sambil mempertahankan massa otot.',
        detail: [['Pengertian', 'Fase memangkas kadar lemak tubuh sebanyak mungkin sambil mempertahankan massa otot.'], ['Aturan Makan', 'Defisit Kalori (kurangi 300-500 kalori dari TDEE).\nProtein tinggi untuk mencegah penyusutan otot.\nWajib diimbangi angkat beban (weightlifting).'], ['Contoh Menu', 'Sarapan: Putih telur rebus dan secangkir oatmeal.\nMakan siang: Dada ayam panggang dan ubi jalar.\nMakan malam: Ikan nila bakar dan bayam rebus.'], ['Manfaat', 'Menurunkan risiko penyakit kardiovaskular.\nTubuh lebih ringan dan definisi otot lebih tajam.']]
      },
      {
        emoji: '💪', name: 'Bulking', color: '#1a4a1a', short: 'Fase peningkatan massa otot melalui surplus kalori yang terstruktur.',
        detail: [['Pengertian', 'Fase peningkatan massa otot dan berat badan secara sengaja melalui pola makan berlebih yang terstruktur.'], ['Aturan Makan', 'Surplus Kalori (tambah 300-500 kalori dari TDEE).\nMengutamakan karbohidrat kompleks & protein tinggi.\nFokus pada latihan beban progresif.'], ['Contoh Menu', 'Sarapan: Telur dadar, roti gandum, selai kacang.\nMakan siang: Nasi porsi besar, daging sapi, tempe.\nMinuman: Susu full cream atau protein shake.'], ['Manfaat', 'Meningkatkan kekuatan fisik dan daya tahan tulang.\nMemperbaiki BMR (metabolisme pembakaran kalori).']]
      },
      {
        emoji: '🥑', name: 'Ketogenik', color: '#3a1a4a', short: 'Diet sangat rendah karbohidrat dan tinggi lemak untuk memicu ketosis.',
        detail: [['Pengertian', 'Diet sangat rendah karbohidrat dan tinggi lemak untuk mengubah sumber energi utama tubuh ke lemak.'], ['Aturan Makan', 'Target: 70% Lemak, 20-25% Protein, 5% Karbohidrat.\nKarbohidrat dibatasi maksimal 20-50 gram/hari.\nMemancing fase "Ketosis" dalam tubuh.'], ['Contoh Menu', 'Sarapan: Telur orak-arik dimasak dengan mentega.\nMakan siang: Salmon panggang, alpukat, dan keju.\nMakan malam: Daging iga berlemak & sayur hijau.'], ['Manfaat', 'Sangat cepat untuk menurunkan berat badan.\nMenstabilkan kadar gula darah dan insulin.']]
      },
    ];

    el.innerHTML = `
      <div class="page-header"><h2><i class="fa fa-leaf" style="color:var(--g3)"></i>Katalog Diet</h2><p>Panduan program diet populer untuk berbagai tujuan kesehatan</p></div>
      <div class="diet-grid" id="diet-grid"></div>`;

    document.getElementById('diet-grid').innerHTML = diets.map((d, i) => `
      <div class="diet-card" onclick="showDiet(${i})" style="cursor:pointer;">
        <div class="diet-cover" style="background:linear-gradient(135deg,${d.color},${d.color}aa)"><span style="font-size:3.5rem">${d.emoji}</span></div>
        <div class="diet-body">
          <div class="diet-name">${d.name}</div>
          <div class="diet-desc">${d.short}</div>
          <div style="margin-top:12px"><span style="font-size:.75rem;color:var(--g3);font-weight:600">Lihat detail →</span></div>
        </div>
      </div>`).join('');

    window.showDiet = (i) => {
      const d = diets[i];

      // Susun isi popup-nya
      let popupBody = `<div style="text-align: center; font-size: 4rem; margin-bottom: 10px;">${d.emoji}</div>`;

      d.detail.forEach(([lbl, val]) => {
        popupBody += `
          <div style="margin-bottom: 12px; text-align: left; background: var(--bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
            <strong style="color: var(--g3); display: block; margin-bottom: 4px;">${lbl}</strong>
            <span style="color: var(--text); font-size: 0.85rem; line-height: 1.5;">${val.replace(/\n/g, '<br>')}</span>
          </div>`;
      });

      // Panggil fungsi openModal bawaan dari kode-mu!
      openModal(
        d.name, // Judul
        popupBody, // Isi konten
        `<button class="btn btn-outline" style="width:100%" onclick="closeModal()">Tutup</button>` // Tombol bawah
      );
    };
  },
};

// Fungsi untuk memunculkan/menyembunyikan menu di HP
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('active');
}

// Fungsi untuk buka-tutup sidebar di HP
window.toggleSidebar = () => {
  const sidebar = document.getElementById('sidebar');
  // Menambah atau menghapus class 'active' pada sidebar
  sidebar.classList.toggle('active');
};

// Opsional: Menutup sidebar secara otomatis saat menu diklik (agar tidak menutupi layar)
document.addEventListener('click', (e) => {
  const sidebar = document.getElementById('sidebar');
  const mobMenu = document.getElementById('mob-menu');

  // Jika klik di luar sidebar dan bukan di tombol menu, tutup sidebar-nya
  if (sidebar.classList.contains('active') && !sidebar.contains(e.target) && !mobMenu.contains(e.target)) {
    sidebar.classList.remove('active');
  }
});

// ─── STARTUP ──────────────────────────────────────────────────────────────────
(async () => {
  renderAttempts();
  const r = await api('check_session');
  if (r.success) {
    currentUser = r.user;
    initApp();
  }
})();