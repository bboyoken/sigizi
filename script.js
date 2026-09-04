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
  { id: 'budget-gizi', icon: 'fa-wallet', label: 'Anggaran Gizi' },
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
    'budget-gizi': 'Kalkulator Anggaran Gizi',
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

  // ── KALKULATOR ANGGARAN GIZI ─────────────────────────────────────────────
  'budget-gizi': (el) => {

    // Database bahan makanan lokal murah
    const bahanLokal = [
      { id: 'telur', nama: 'Telur Ayam', harga: 3000, sat: 'butir', gram: 55, kal: 78, pro: 6.3, karb: 0.6, lem: 5.3, kat: 'protein' },
      { id: 'tahu', nama: 'Tahu Putih', harga: 1250, sat: 'potong', gram: 80, kal: 62, pro: 6.7, karb: 1.9, lem: 3.5, kat: 'protein' },
      { id: 'tempe', nama: 'Tempe Besar', harga: 5000, sat: 'bungkus', gram: 400, kal: 768, pro: 75.2, karb: 60, lem: 29.6, kat: 'protein' },
      { id: 'ayam_dada', nama: 'Dada Ayam Pasar', harga: 8000, sat: 'potong', gram: 100, kal: 165, pro: 31, karb: 0, lem: 3.6, kat: 'protein' },
      { id: 'ikan_kembung', nama: 'Ikan Kembung', harga: 10000, sat: 'ekor', gram: 100, kal: 105, pro: 22, karb: 0, lem: 1.9, kat: 'protein' },
      { id: 'kacang_tanah', nama: 'Kacang Tanah', harga: 2000, sat: 'genggam', gram: 30, kal: 170, pro: 7.7, karb: 5.0, lem: 14, kat: 'protein' },
      { id: 'tahu_goreng', nama: 'Tahu Goreng', harga: 2000, sat: 'potong', gram: 80, kal: 109, pro: 7.0, karb: 2.8, lem: 8.1, kat: 'protein' },
      { id: 'nasi', nama: 'Beras Putih', harga: 15000, sat: 'kg', gram: 1000, kal: 1300, pro: 26.7, karb: 280, lem: 3.3, kat: 'karbo' },
      { id: 'nasi_merah', nama: 'Nasi Merah', harga: 4000, sat: 'porsi', gram: 150, kal: 173, pro: 4.5, karb: 36, lem: 1.0, kat: 'karbo' },
      { id: 'roti', nama: 'Roti Tawar', harga: 16000, sat: 'bungkus', gram: 500, kal: 1320, pro: 45, karb: 250, lem: 16.5, kat: 'karbo' },
      { id: 'ubi', nama: 'Ubi Jalar', harga: 2000, sat: 'buah', gram: 100, kal: 86, pro: 1.6, karb: 20, lem: 0.1, kat: 'karbo' },
      { id: 'oatmeal', nama: 'Oatmeal Instan', harga: 15000, sat: 'kemasan', gram: 200, kal: 754, pro: 25.7, karb: 131, lem: 14.3, kat: 'karbo' },
      { id: 'pisang', nama: 'Pisang', harga: 15000, sat: 'ikat', gram: 1000, kal: 890, pro: 11, karb: 228, lem: 3.3, kat: 'buah' },
      { id: 'pepaya', nama: 'Pepaya', harga: 2000, sat: 'potong', gram: 150, kal: 60, pro: 0.7, karb: 15, lem: 0.1, kat: 'buah' },
      { id: 'bayam', nama: 'Bayam Rebus', harga: 2000, sat: 'porsi', gram: 100, kal: 23, pro: 2.9, karb: 3.6, lem: 0.4, kat: 'sayur' },
      { id: 'kangkung', nama: 'Kangkung', harga: 5000, sat: 'ikat', gram: 200, kal: 38, pro: 4.0, karb: 6.2, lem: 0.4, kat: 'sayur' },
      { id: 'sawi', nama: 'Sawi', harga: 5000, sat: 'ikat', gram: 200, kal: 22, pro: 2.7, karb: 3.4, lem: 0.3, kat: 'sayur' },
      { id: 'mie_instan', nama: 'Mie Instan', harga: 3500, sat: 'bungkus', gram: 85, kal: 380, pro: 8.0, karb: 52, lem: 15, kat: 'karbo' },
      { id: 'susu_kotak', nama: 'Susu UHT Milk', harga: 6000, sat: 'kotak', gram: 250, kal: 158, pro: 8.8, karb: 17.5, lem: 6.0, kat: 'lainnya' },
    ];

    // Algoritma Greedy 3 Fase
    function optimasiAnggaranGizi(budget, targetProtein, preferensi) {
      let sisa = budget;
      let totalPro = 0, totalKal = 0, totalKarb = 0, totalLem = 0, totalHarga = 0;
      const keranjang = [];

      let pool = bahanLokal.filter(b => {
        if (preferensi === 'vegetarian') return b.kat !== 'protein' || ['tahu', 'tempe', 'telur', 'kacang_tanah', 'tahu_goreng'].includes(b.id);
        if (preferensi === 'ikan') return b.kat !== 'protein' || ['ikan_kembung', 'tahu', 'tempe', 'telur', 'kacang_tanah', 'tahu_goreng'].includes(b.id);
        return true;
      });

      // Fase 1: Protein (greedy protein/harga tertinggi)
      const proteinPool = pool.filter(b => b.kat === 'protein').sort((a, b) => (b.pro / b.harga) - (a.pro / a.harga));
      for (const b of proteinPool) {
        if (totalPro >= targetProtein) break;
        const porsiDibutuhkan = Math.ceil((targetProtein - totalPro) / b.pro);
        const porsiMampu = Math.floor(sisa / b.harga);
        const porsi = Math.min(porsiDibutuhkan, porsiMampu, 4);
        if (porsi <= 0) continue;
        const hargaTotal = porsi * b.harga;
        keranjang.push({ ...b, porsi, hargaTotal });
        sisa -= hargaTotal; totalPro += b.pro * porsi; totalKal += b.kal * porsi;
        totalKarb += b.karb * porsi; totalLem += b.lem * porsi; totalHarga += hargaTotal;
      }

      // Fase 2: Karbohidrat
      const karboPool = pool.filter(b => b.kat === 'karbo').sort((a, b) => (b.kal / b.harga) - (a.kal / a.harga));
      for (const b of karboPool) {
        if (sisa < b.harga || keranjang.some(k => k.id === b.id)) continue;
        const porsi = Math.min(Math.floor(sisa / b.harga), 2);
        if (porsi <= 0) continue;
        const hargaTotal = porsi * b.harga;
        keranjang.push({ ...b, porsi, hargaTotal });
        sisa -= hargaTotal; totalKal += b.kal * porsi; totalKarb += b.karb * porsi;
        totalLem += b.lem * porsi; totalHarga += hargaTotal;
      }

      // Fase 3: Sayur & Buah
      for (const b of pool.filter(b => b.kat === 'sayur' || b.kat === 'buah')) {
        if (sisa < b.harga) continue;
        keranjang.push({ ...b, porsi: 1, hargaTotal: b.harga });
        sisa -= b.harga; totalKal += b.kal; totalHarga += b.harga;
      }

      return {
        keranjang,
        totalPro: Math.round(totalPro * 10) / 10,
        totalKal: Math.round(totalKal),
        totalKarb: Math.round(totalKarb * 10) / 10,
        totalLem: Math.round(totalLem * 10) / 10,
        totalHarga,
        sisaBudget: budget - totalHarga,
        tercapai: totalPro >= targetProtein * 0.85,
      };
    }

    // Render halaman
    el.innerHTML = `
      <div class="page-header">
        <h2><i class="fa fa-wallet" style="color:var(--g3)"></i> Kalkulator Anggaran Gizi</h2>
        <p>Racik menu harian bergizi sesuai kantong — cocok untuk mahasiswa & calon Abdi Negara!</p>
      </div>
      <div style="display:grid;grid-template-columns:360px 1fr;gap:22px;align-items:start">

        <!-- Panel Kiri: Input -->
        <div class="card" style="position:sticky;top:80px;align-self:start;max-height:calc(100vh - 100px);overflow-y:auto">
          <div class="card-header">
            <div class="card-title"><div class="card-icon icon-green"><i class="fa fa-sliders"></i></div>Atur Parameter</div>
          </div>
          <div style="padding:0 4px 4px">
            <div class="form-group" style="margin-bottom:18px">
              <label class="form-label"><i class="fa fa-money-bill-wave" style="color:var(--g3);margin-right:6px"></i>Budget Harian</label>
              <div style="position:relative">
                <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);font-weight:600;color:var(--muted);font-size:.9rem">Rp</span>
                <input id="bg-budget" type="number" class="form-input" style="padding-left:38px;font-size:1.05rem;font-weight:600;color:var(--g2)" placeholder="Contoh: 30000" value="" min="5000" max="200000" step="1000"/>
              </div>
              <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
                ${[15000, 25000, 30000, 50000, 75000].map(v => `<button class="budget-preset" onclick="document.getElementById('bg-budget').value=${v}">Rp ${v.toLocaleString('id-ID')}</button>`).join('')}
              </div>
            </div>
            <div class="form-group" style="margin-bottom:18px">
              <label class="form-label"><i class="fa fa-dumbbell" style="color:var(--g3);margin-right:6px"></i>Target Protein Harian</label>
              <div style="position:relative">
                <input id="bg-protein" type="number" class="form-input" style="padding-right:42px;font-size:1.05rem;font-weight:600;color:var(--g2)" placeholder="Contoh: 50" value="" min="20" max="200"/>
                <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:.82rem;color:var(--muted)">gram</span>
              </div>
              <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
                <button class="budget-preset" onclick="document.getElementById('bg-protein').value=40">Ringan 40g</button>
                <button class="budget-preset" onclick="document.getElementById('bg-protein').value=55">Sedang 55g</button>
                <button class="budget-preset" onclick="document.getElementById('bg-protein').value=75">Aktif 75g</button>
                <button class="budget-preset" onclick="document.getElementById('bg-protein').value=100">Atlet 100g</button>
              </div>
            </div>
            <div class="form-group" style="margin-bottom:22px">
              <label class="form-label"><i class="fa fa-leaf" style="color:var(--g3);margin-right:6px"></i>Preferensi Makanan</label>
              <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px">
                <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 14px;border-radius:10px;border:2px solid var(--g4);background:var(--bg);font-size:.88rem">
                  <input type="radio" name="bg-pref" value="semua" checked style="accent-color:var(--g3)"/> <i class="fa fa-utensils" style="color:var(--g3)"></i> Semua (termasuk ayam & ikan)
                </label>
                <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 14px;border-radius:10px;border:2px solid var(--border);background:var(--bg);font-size:.88rem">
                  <input type="radio" name="bg-pref" value="ikan" style="accent-color:var(--g3)"/> <i class="fa fa-fish" style="color:var(--g3)"></i> Ikan & Nabati (tanpa ayam)
                </label>
                <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 14px;border-radius:10px;border:2px solid var(--border);background:var(--bg);font-size:.88rem">
                  <input type="radio" name="bg-pref" value="vegetarian" style="accent-color:var(--g3)"/> <i class="fa fa-seedling" style="color:var(--g3)"></i> Vegetarian (telur, tahu, tempe)
                </label>
              </div>
            </div>
            <button class="btn btn-primary" style="width:100%;font-size:1rem;padding:14px" onclick="hitungAnggaranGizi()">
              <i class="fa fa-magic"></i> Racik Menu Hemat!
            </button>
          </div>
        </div>

        <!-- Panel Kanan: Hasil -->
        <div>
          <div id="bg-result" style="display:none">
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px" id="bg-summary"></div>
            <div class="card" style="margin-bottom:20px" id="bg-protein-bar-card"></div>
            <div class="card" style="margin-bottom:20px">
              <div class="card-header">
                <div class="card-title"><div class="card-icon icon-green"><i class="fa fa-shopping-basket"></i></div>Komposisi Menu Hari Ini</div>
                <span id="bg-badge-hemat" class="status-badge"></span>
              </div>
              <div id="bg-keranjang"></div>
            </div>
            <div class="card" style="margin-bottom:20px">
              <div class="card-header">
                <div class="card-title"><div class="card-icon" style="background:#fef3c7;color:#d97706"><i class="fa fa-clock"></i></div>Saran Jadwal Makan</div>
              </div>
              <div id="bg-jadwal" style="padding:4px"></div>
            </div>
            <div class="card" id="bg-tips"></div>
          </div>
          <div id="bg-empty" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;text-align:center">
            <div style="font-size:3.5rem;color:var(--muted);margin-bottom:16px"><i class="fa fa-shopping-cart"></i></div>
            <div style="font-weight:700;font-size:1.15rem;color:var(--text);margin-bottom:8px">Siap meracik menu hemat?</div>
            <p style="color:var(--muted);font-size:.9rem;max-width:300px;line-height:1.6">Masukkan budget dan target protein di sebelah kiri, lalu klik <strong>Racik Menu Hemat!</strong></p>
          </div>
        </div>
      </div>
    `;

    // Update radio border on change
    el.querySelectorAll('input[name="bg-pref"]').forEach(r => {
      r.addEventListener('change', () => {
        el.querySelectorAll('input[name="bg-pref"]').forEach(x => x.closest('label').style.borderColor = 'var(--border)');
        r.closest('label').style.borderColor = 'var(--g4)';
      });
    });

    window.hitungAnggaranGizi = () => {
      const budgetVal = document.getElementById('bg-budget').value.trim();
      const proteinVal = document.getElementById('bg-protein').value.trim();
      if (!budgetVal || !proteinVal) {
        toast('Silakan isi Budget Harian dan Target Protein terlebih dahulu!', 'warning');
        return;
      }
      const budget = parseInt(budgetVal);
      const targetProtein = parseInt(proteinVal);
      const preferensi = document.querySelector('input[name="bg-pref"]:checked')?.value || 'semua';
      if (budget < 5000) { toast('Budget minimal Rp 5.000', 'warning'); return; }
      if (targetProtein < 10) { toast('Target protein minimal 10g', 'warning'); return; }
      const hasil = optimasiAnggaranGizi(budget, targetProtein, preferensi);
      renderHasil(hasil, budget, targetProtein);
    };

    function renderHasil(h, budget, targetProtein) {
      document.getElementById('bg-empty').style.display = 'none';
      document.getElementById('bg-result').style.display = 'block';

      // Summary cards
      const proteinPct = Math.min(100, Math.round((h.totalPro / targetProtein) * 100));
      document.getElementById('bg-summary').innerHTML = [
        { icon: 'fa-fire', label: 'Total Kalori', val: `${h.totalKal} kkal`, color: '#ef4444', bg: '#fef2f2' },
        { icon: 'fa-drumstick-bite', label: 'Total Protein', val: `${h.totalPro}g`, color: '#7c3aed', bg: '#ede9fe' },
        { icon: 'fa-receipt', label: 'Total Biaya', val: `Rp ${h.totalHarga.toLocaleString('id-ID')}`, color: '#d97706', bg: '#fef3c7' },
        { icon: 'fa-piggy-bank', label: 'Sisa Budget', val: `Rp ${h.sisaBudget.toLocaleString('id-ID')}`, color: h.sisaBudget >= 0 ? '#15803d' : '#ef4444', bg: h.sisaBudget >= 0 ? '#f0fdf4' : '#fef2f2' },
      ].map(s => `
        <div class="stat-card" style="flex-direction:column;text-align:center;padding:16px 12px">
          <div class="stat-icon" style="background:${s.bg};color:${s.color};margin:0 auto 10px"><i class="fa ${s.icon}"></i></div>
          <div style="font-size:1rem;font-weight:700;color:${s.color}">${s.val}</div>
          <div class="stat-label" style="margin-top:4px">${s.label}</div>
        </div>`).join('');

      // Protein progress bar
      const barColor = proteinPct >= 100 ? '#15803d' : proteinPct >= 75 ? '#d97706' : '#ef4444';
      const barMsg = proteinPct >= 100 ? '<i class="fa fa-check-circle"></i> Target protein tercapai!' : proteinPct >= 75 ? '<i class="fa fa-exclamation-triangle"></i> Mendekati target' : '<i class="fa fa-times-circle"></i> Target belum terpenuhi';
      document.getElementById('bg-protein-bar-card').innerHTML = `
        <div class="card-header">
          <div class="card-title"><div class="card-icon" style="background:#ede9fe;color:#7c3aed"><i class="fa fa-bullseye"></i></div>Pencapaian Target Protein</div>
          <span style="font-weight:700;color:${barColor}">${h.totalPro}g / ${targetProtein}g</span>
        </div>
        <div style="padding:0 4px 16px">
          <div style="background:var(--border);border-radius:99px;height:16px;overflow:hidden;margin-bottom:8px">
            <div style="height:100%;border-radius:99px;background:${barColor};width:${proteinPct}%;transition:width 1s ease;min-width:4px"></div>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="font-size:.85rem;color:${barColor};font-weight:600">${barMsg}</span>
            <span style="font-size:.85rem;color:var(--muted)">${proteinPct}% terpenuhi</span>
          </div>
        </div>`;

      // Keranjang belanja
      const katColor = { protein: '#7c3aed', karbo: '#d97706', sayur: '#15803d', buah: '#e11d48', lainnya: '#3b82f6' };
      const katBg = { protein: '#ede9fe', karbo: '#fef3c7', sayur: '#f0fdf4', buah: '#fff1f2', lainnya: '#eff6ff' };
      document.getElementById('bg-keranjang').innerHTML = h.keranjang.length ? `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px;padding:4px">
          ${h.keranjang.map(item => `
            <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--bg);border-radius:12px;border:1.5px solid var(--border)">
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:.87rem;color:var(--text)">${item.nama}</div>
                <div style="font-size:.74rem;color:var(--muted);margin-top:2px">${item.porsi} ${item.sat} · ${Math.round(item.pro * item.porsi * 10) / 10}g protein</div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:5px">
                  <span style="font-size:.72rem;background:${katBg[item.kat]};color:${katColor[item.kat]};padding:2px 7px;border-radius:99px;font-weight:600">${item.kat}</span>
                  <span style="font-size:.82rem;font-weight:700;color:var(--g2)">Rp ${item.hargaTotal.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>`).join('')}
        </div>
        <div style="padding:12px 14px 6px;border-top:1px solid var(--border);display:flex;justify-content:space-between;font-size:.86rem;color:var(--muted)">
          <span>${h.keranjang.length} item · ${h.keranjang.reduce((a, b) => a + b.porsi, 0)} porsi</span>
          <span style="color:var(--g2);font-weight:700">Total: Rp ${h.totalHarga.toLocaleString('id-ID')}</span>
        </div>` :
        `<div class="empty-state"><div class="empty-icon"><i class="fa fa-shopping-cart"></i></div><div class="empty-title">Budget terlalu kecil</div></div>`;

      const hemPct = Math.round((h.sisaBudget / budget) * 100);
      document.getElementById('bg-badge-hemat').innerHTML = hemPct > 0 ? `<i class="fa fa-coins"></i> Hemat ${hemPct}%` : '<i class="fa fa-check-circle"></i> Budget optimal';
      document.getElementById('bg-badge-hemat').className = `status-badge ${hemPct > 5 ? 'status-diterima' : 'status-pending'}`;

      // Jadwal makan
      const protein = h.keranjang.filter(k => k.kat === 'protein');
      const karbo = h.keranjang.filter(k => k.kat === 'karbo');
      const lain = h.keranjang.filter(k => k.kat === 'sayur' || k.kat === 'buah');
      const slot = (icon, waktu, warna, items) => {
        if (!items.length) return '';
        return `<div style="display:flex;gap:14px;padding:13px;border-radius:12px;background:${warna};margin-bottom:10px;align-items:flex-start">
          <div style="font-size:1.4rem;min-width:30px;text-align:center">${icon}</div>
          <div><div style="font-weight:700;font-size:.88rem;margin-bottom:4px">${waktu}</div>
          <div style="font-size:.82rem;color:var(--muted);line-height:1.7">${items.map(i => `${i.porsi > 1 ? i.porsi + '× ' : ''}${i.nama}`).join(' + ')}</div></div>
        </div>`;
      };
      document.getElementById('bg-jadwal').innerHTML = `<div style="padding:4px 4px 10px">
        ${slot('<i class="fa fa-sun" style="color:#d97706"></i>', 'Sarapan (06.00–08.00)', '#fef9c3', [...karbo.slice(0, 1), ...protein.slice(0, 1), ...lain.slice(0, 1)])}
        ${slot('<i class="fa fa-utensils" style="color:#15803d"></i>', 'Makan Siang (11.00–13.00)', '#dcfce7', [...karbo.slice(1, 2), ...protein.slice(1, 3)])}
        ${slot('<i class="fa fa-moon" style="color:#7c3aed"></i>', 'Makan Malam (17.00–19.00)', '#ede9fe', [...karbo.slice(2, 3), ...protein.slice(3,)])}
        ${slot('<i class="fa fa-cookie-bite" style="color:#e11d48"></i>', 'Cemilan', '#fff1f2', lain.slice(1,))}
      </div>`;

      // Tips
      const tips = [];
      if (!h.tercapai) tips.push({ icon: '<i class="fa fa-lightbulb" style="color:#d97706"></i>', msg: `Target protein belum penuh. Coba naikkan budget atau turunkan target protein.` });
      tips.push({ icon: '<i class="fa fa-egg" style="color:#7c3aed"></i>', msg: '<strong>Telur</strong> adalah sumber protein termurah per gram — tambahkan tiap hari!' });
      tips.push({ icon: '<i class="fa fa-shopping-basket" style="color:#15803d"></i>', msg: 'Belanja di <strong>pasar tradisional</strong> bisa hemat 20–40% vs supermarket.' });
      tips.push({ icon: '<i class="fa fa-clock" style="color:#2563eb"></i>', msg: '<strong>Meal prep</strong> hari Minggu: masak banyak sekaligus, simpan di kulkas, hemat waktu & uang.' });
      if (h.totalKal < 1500) tips.push({ icon: '<i class="fa fa-bolt" style="color:#e11d48"></i>', msg: 'Kalori masih kurang dari 1500 kkal. Tambahkan <strong>nasi merah atau ubi</strong> untuk energi.' });
      document.getElementById('bg-tips').innerHTML = `
        <div class="card-header"><div class="card-title"><div class="card-icon" style="background:#fef3c7;color:#d97706"><i class="fa fa-lightbulb"></i></div>Tips Hemat & Bergizi</div></div>
        <div style="padding:4px 4px 14px;display:flex;flex-direction:column;gap:8px">
          ${tips.map(t => `<div style="display:flex;gap:12px;align-items:flex-start;padding:11px 14px;background:var(--bg);border-radius:10px;border-left:3px solid var(--g4)">
            <span style="font-size:1.1rem;min-width:22px">${t.icon}</span>
            <p style="font-size:.84rem;color:var(--text);line-height:1.6;margin:0">${t.msg}</p>
          </div>`).join('')}
        </div>`;

      document.getElementById('bg-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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