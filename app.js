/**
 * ═══════════════════════════════════════════════════════
 *  SPORTDATA — app.js
 *  Full client-side logic: Auth, Athletes CRUD,
 *  Analytics, Media, UI rendering
 * ═══════════════════════════════════════════════════════
 */

'use strict';

/* ── CONSTANTS ─────────────────────────────────────────── */
const STORAGE_KEYS = {
  USERS:        'sportdata_users',
  ATHLETES:     'sportdata_athletes',
  CURRENT_USER: 'sportdata_current_user',
};

const SPORT_COLORS = {
  'Football':   '#22d3ee',
  'Athletics':  '#34d399',
  'Basketball': '#fbbf24',
  'Swimming':   '#60a5fa',
  'Boxing':     '#f87171',
  'Rugby':      '#a78bfa',
  'Tennis':     '#fb923c',
  'Cycling':    '#4ade80',
  'Volleyball': '#e879f9',
  'Other':      '#94a3b8',
};

/* ── STATE ──────────────────────────────────────────────── */
let currentUser   = null;
let athletes      = [];
let currentPage   = 'dashboard';
let editPhotoData = null;   // base64 photo being edited
let editVideos    = [];     // array of { name, data } being edited
let openAthleteId = null;   // modal athlete id

/* ══════════════════════════════════════════════════════════
   INITIALISATION
   ══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  seedDemoAccount();
  loadAthletes();

  const saved = getStorage(STORAGE_KEYS.CURRENT_USER);
  if (saved) {
    currentUser = saved;
    bootApp();
  }
  // else: auth overlay already visible via HTML
});

/** Ensure demo account exists */
function seedDemoAccount() {
  let users = getStorage(STORAGE_KEYS.USERS) || [];
  const exists = users.find(u => u.email === 'admin@sportdata.africa');
  if (!exists) {
    users.push({
      id: 'demo',
      fname: 'Admin',
      lname: 'SportData',
      email: 'admin@sportdata.africa',
      password: 'admin123',
      org: 'SportData Africa',
    });
    setStorage(STORAGE_KEYS.USERS, users);
  }

  // Seed sample athletes if empty
  let stored = getStorage(STORAGE_KEYS.ATHLETES) || [];
  if (stored.length === 0) {
    stored = getSampleAthletes();
    setStorage(STORAGE_KEYS.ATHLETES, stored);
  }
}

function loadAthletes() {
  athletes = getStorage(STORAGE_KEYS.ATHLETES) || [];
}

function saveAthletes() {
  setStorage(STORAGE_KEYS.ATHLETES, athletes);
}

/* ══════════════════════════════════════════════════════════
   STORAGE HELPERS
   ══════════════════════════════════════════════════════════ */
function getStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/* ══════════════════════════════════════════════════════════
   AUTH
   ══════════════════════════════════════════════════════════ */
function showScreen(screen) {
  document.querySelectorAll('.auth-screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${screen}`).classList.add('active');
}

function handleLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');

  errEl.classList.add('hidden');

  if (!email || !password) {
    showError(errEl, 'Please enter your email and password.');
    return;
  }

  const users = getStorage(STORAGE_KEYS.USERS) || [];
  const user  = users.find(u => u.email === email && u.password === password);

  if (!user) {
    showError(errEl, 'Invalid email or password. Try admin@sportdata.africa / admin123');
    return;
  }

  currentUser = user;
  setStorage(STORAGE_KEYS.CURRENT_USER, user);
  bootApp();
}

function handleSignup() {
  const fname    = document.getElementById('signup-fname').value.trim();
  const lname    = document.getElementById('signup-lname').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const org      = document.getElementById('signup-org').value.trim();
  const errEl    = document.getElementById('signup-error');

  errEl.classList.add('hidden');

  if (!fname || !lname || !email || !password) {
    showError(errEl, 'Please fill in all required fields.');
    return;
  }
  if (password.length < 6) {
    showError(errEl, 'Password must be at least 6 characters.');
    return;
  }

  let users = getStorage(STORAGE_KEYS.USERS) || [];
  if (users.find(u => u.email === email)) {
    showError(errEl, 'This email is already registered.');
    return;
  }

  const newUser = { id: uid(), fname, lname, email, password, org };
  users.push(newUser);
  setStorage(STORAGE_KEYS.USERS, users);

  currentUser = newUser;
  setStorage(STORAGE_KEYS.CURRENT_USER, newUser);
  bootApp();
}

function handleLogout() {
  currentUser = null;
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  document.getElementById('app').classList.add('hidden');
  document.getElementById('auth-overlay').style.display = 'flex';
  showScreen('login');
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
}

function bootApp() {
  document.getElementById('auth-overlay').style.display = 'none';
  document.getElementById('app').classList.remove('hidden');

  // Update sidebar user info
  document.getElementById('sidebar-name').textContent =
    `${currentUser.fname} ${currentUser.lname}`;
  document.getElementById('sidebar-avatar').textContent =
    (currentUser.fname[0] || 'A').toUpperCase();

  navigate('dashboard');
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

/* ══════════════════════════════════════════════════════════
   NAVIGATION
   ══════════════════════════════════════════════════════════ */
const PAGE_TITLES = {
  'dashboard':   'Dashboard',
  'athletes':    'Athletes',
  'add-athlete': 'Add Athlete',
  'analytics':   'Analytics',
  'media':       'Media Library',
};

function navigate(page, e) {
  if (e) e.preventDefault();
  currentPage = page;

  // Pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add('active');

  // Nav items
  document.querySelectorAll('.nav-item').forEach(i => {
    i.classList.toggle('active', i.dataset.page === page);
  });

  // Topbar title
  document.getElementById('page-title').textContent = PAGE_TITLES[page] || '';

  // Close sidebar on mobile
  if (window.innerWidth < 768) {
    document.getElementById('sidebar').classList.remove('open');
  }

  // Page-specific render
  switch (page) {
    case 'dashboard':   renderDashboard(); break;
    case 'athletes':    renderAthletes(); break;
    case 'analytics':   renderAnalytics(); break;
    case 'media':       renderMedia(); break;
    case 'add-athlete':
      resetAthleteForm();
      document.getElementById('form-page-title').textContent = 'Add Athlete';
      document.getElementById('save-btn-text').textContent   = 'Save Athlete';
      break;
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

/* ══════════════════════════════════════════════════════════
   DASHBOARD
   ══════════════════════════════════════════════════════════ */
function renderDashboard() {
  const total = athletes.length;
  const avgAge    = avg(athletes.map(a => +a.age)).toFixed(1);
  const avgHeight = avg(athletes.map(a => +a.height).filter(Boolean)).toFixed(1);
  const avgWeight = avg(athletes.map(a => +a.weight).filter(Boolean)).toFixed(1);

  document.getElementById('stat-total').textContent       = total;
  document.getElementById('stat-avg-age').textContent     = total ? avgAge    : '—';
  document.getElementById('stat-avg-height').textContent  = total ? avgHeight : '—';
  document.getElementById('stat-avg-weight').textContent  = total ? avgWeight : '—';
  document.getElementById('athletes-count-badge').textContent = total;

  renderRecentAthletes();
  renderSportDistribution();
}

function renderRecentAthletes() {
  const container = document.getElementById('recent-athletes-list');
  const recent = [...athletes].reverse().slice(0, 5);

  if (!recent.length) {
    container.innerHTML = '<p class="empty-msg">No athletes yet. <a href="#" onclick="navigate(\'add-athlete\')">Add one.</a></p>';
    return;
  }

  container.innerHTML = recent.map(a => `
    <div class="recent-item" onclick="openAthleteModal('${a.id}')">
      ${a.photo
        ? `<img class="recent-item-photo" src="${a.photo}" alt="${a.name}"/>`
        : `<div class="recent-item-photo">${initials(a.name)}</div>`}
      <div class="recent-item-info">
        <div class="recent-item-name">${esc(a.name)}</div>
        <div class="recent-item-sport">${esc(a.country || '')} · ${esc(a.sport)}</div>
      </div>
      <span class="recent-item-badge">${esc(a.sport)}</span>
    </div>
  `).join('');
}

function renderSportDistribution() {
  const container = document.getElementById('sport-distribution');
  const dist = sportCounts();
  const maxVal = Math.max(...Object.values(dist), 1);
  const sorted = Object.entries(dist).sort((a,b) => b[1]-a[1]);

  if (!sorted.length) {
    container.innerHTML = '<p class="empty-msg">No data yet.</p>';
    return;
  }

  container.innerHTML = sorted.map(([sport, count]) => `
    <div class="sport-row">
      <span class="sport-name">${esc(sport)}</span>
      <div class="sport-bar-wrap">
        <div class="sport-bar" style="width:${(count/maxVal)*100}%; background:${SPORT_COLORS[sport]||'var(--accent)'}"></div>
      </div>
      <span class="sport-count">${count}</span>
    </div>
  `).join('');
}

/* ══════════════════════════════════════════════════════════
   ATHLETES LIST
   ══════════════════════════════════════════════════════════ */
function renderAthletes(filtered) {
  const list = filtered !== undefined ? filtered : athletes;
  const grid = document.getElementById('athletes-grid');
  updateSportFilter();

  if (!list.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 80 80" fill="none" width="64" height="64">
          <circle cx="40" cy="28" r="14" stroke="#475569" stroke-width="2"/>
          <path d="M12 70c0-15.464 12.536-28 28-28s28 12.536 28 28" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <p>No athletes found.<br><a href="#" onclick="navigate('add-athlete')">Add your first athlete →</a></p>
      </div>`;
    return;
  }

  grid.innerHTML = list.map(a => `
    <div class="athlete-card" data-id="${a.id}">
      <div class="card-photo-wrap">
        ${a.photo
          ? `<img src="${a.photo}" alt="${esc(a.name)}" loading="lazy"/>`
          : `<div class="card-photo-initials">${initials(a.name)}</div>`}
        <span class="card-sport-tag">${esc(a.sport)}</span>
      </div>
      <div class="card-body">
        <div class="card-name">${esc(a.name)}</div>
        <div class="card-meta">${esc(a.country||'Africa')} · ${esc(a.age||'?')} yrs</div>
        <div class="card-stats">
          <div class="card-stat">
            <div class="card-stat-val">${a.height||'—'}</div>
            <div class="card-stat-label">Height</div>
          </div>
          <div class="card-stat">
            <div class="card-stat-val">${a.weight||'—'}</div>
            <div class="card-stat-label">Weight</div>
          </div>
          <div class="card-stat">
            <div class="card-stat-val">${a.sprint||'—'}</div>
            <div class="card-stat-label">100m (s)</div>
          </div>
        </div>
        <div class="card-actions">
          <button class="card-btn view"   onclick="openAthleteModal('${a.id}')">View</button>
          <button class="card-btn edit"   onclick="editAthlete('${a.id}')">Edit</button>
          <button class="card-btn delete" onclick="deleteAthlete('${a.id}', event)">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

function filterAthletes() {
  const q     = document.getElementById('search-input').value.toLowerCase();
  const sport = document.getElementById('sport-filter').value;

  const filtered = athletes.filter(a => {
    const matchText  = a.name.toLowerCase().includes(q) ||
                       (a.country||'').toLowerCase().includes(q) ||
                       a.sport.toLowerCase().includes(q);
    const matchSport = !sport || a.sport === sport;
    return matchText && matchSport;
  });

  renderAthletes(filtered);
}

function updateSportFilter() {
  const sel = document.getElementById('sport-filter');
  const current = sel.value;
  const sports = [...new Set(athletes.map(a => a.sport))].sort();
  sel.innerHTML = '<option value="">All Sports</option>' +
    sports.map(s => `<option value="${esc(s)}" ${s===current?'selected':''}>${esc(s)}</option>`).join('');
}

function deleteAthlete(id, event) {
  if (event) event.stopPropagation();
  if (!confirm('Delete this athlete? This cannot be undone.')) return;
  athletes = athletes.filter(a => a.id !== id);
  saveAthletes();
  toast('Athlete deleted.', 'error');
  renderAthletes();
  renderDashboard();
}

/* ══════════════════════════════════════════════════════════
   ADD / EDIT ATHLETE FORM
   ══════════════════════════════════════════════════════════ */
function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  readFileAsDataURL(file).then(data => {
    editPhotoData = data;
    const preview = document.getElementById('photo-preview');
    preview.src = data;
    preview.classList.remove('hidden');
    document.getElementById('photo-placeholder').classList.add('hidden');
  });
}

function handleVideoUpload(event) {
  const files = Array.from(event.target.files);
  files.forEach(file => {
    readFileAsDataURL(file).then(data => {
      editVideos.push({ name: file.name, data });
      renderVideoPreview();
    });
  });
}

function renderVideoPreview() {
  const container = document.getElementById('video-preview-list');
  container.innerHTML = editVideos.map((v, i) => `
    <div class="video-preview-item">
      <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
        <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.2"/>
        <path d="M6 6l4 2-4 2V6z" fill="currentColor"/>
      </svg>
      <span>${esc(v.name)}</span>
      <button style="margin-left:auto;background:none;border:none;color:var(--danger);cursor:pointer;font-size:12px" onclick="removeVideo(${i})">✕</button>
    </div>
  `).join('');
}

function removeVideo(i) {
  editVideos.splice(i, 1);
  renderVideoPreview();
}

function saveAthlete() {
  const name    = document.getElementById('f-name').value.trim();
  const age     = document.getElementById('f-age').value.trim();
  const sport   = document.getElementById('f-sport').value;

  if (!name || !age || !sport) {
    toast('Name, age and sport are required.', 'error');
    return;
  }

  const id = document.getElementById('f-edit-id').value || uid();

  const athlete = {
    id,
    name,    age,    sport,
    email:   document.getElementById('f-email').value.trim(),
    country: document.getElementById('f-country').value.trim(),

    // Anthropometric
    height:    document.getElementById('f-height').value,
    weight:    document.getElementById('f-weight').value,
    armspan:   document.getElementById('f-armspan').value,
    leglength: document.getElementById('f-leglength').value,
    chest:     document.getElementById('f-chest').value,
    waist:     document.getElementById('f-waist').value,

    // Physical Performance
    sprint:    document.getElementById('f-sprint').value,
    jump:      document.getElementById('f-jump').value,
    vo2:       document.getElementById('f-vo2').value,
    speed:     document.getElementById('f-speed').value,
    strength:  document.getElementById('f-strength').value,
    endurance: document.getElementById('f-endurance').value,

    // Physiological
    hr:          document.getElementById('f-hr').value,
    bodyfat:     document.getElementById('f-bodyfat').value,
    muscle:      document.getElementById('f-muscle').value,
    flexibility: document.getElementById('f-flexibility').value,
    notes:       document.getElementById('f-notes').value.trim(),

    // Media
    photo:  editPhotoData,
    videos: [...editVideos],

    createdAt: Date.now(),
  };

  const existIdx = athletes.findIndex(a => a.id === id);
  if (existIdx >= 0) {
    athletes[existIdx] = athlete;
    toast(`${name} updated successfully!`, 'success');
  } else {
    athletes.push(athlete);
    toast(`${name} added to the roster!`, 'success');
  }

  saveAthletes();
  resetAthleteForm();
  navigate('athletes');
}

function editAthlete(id) {
  const a = athletes.find(a => a.id === id);
  if (!a) return;

  navigate('add-athlete');
  document.getElementById('form-page-title').textContent = 'Edit Athlete';
  document.getElementById('save-btn-text').textContent   = 'Update Athlete';

  // Populate fields
  document.getElementById('f-edit-id').value  = a.id;
  document.getElementById('f-name').value     = a.name || '';
  document.getElementById('f-age').value      = a.age  || '';
  document.getElementById('f-sport').value    = a.sport|| '';
  document.getElementById('f-email').value    = a.email|| '';
  document.getElementById('f-country').value  = a.country|| '';
  document.getElementById('f-height').value   = a.height|| '';
  document.getElementById('f-weight').value   = a.weight|| '';
  document.getElementById('f-armspan').value  = a.armspan|| '';
  document.getElementById('f-leglength').value= a.leglength|| '';
  document.getElementById('f-chest').value    = a.chest|| '';
  document.getElementById('f-waist').value    = a.waist|| '';
  document.getElementById('f-sprint').value   = a.sprint|| '';
  document.getElementById('f-jump').value     = a.jump|| '';
  document.getElementById('f-vo2').value      = a.vo2|| '';
  document.getElementById('f-speed').value    = a.speed|| '';
  document.getElementById('f-strength').value = a.strength|| '';
  document.getElementById('f-endurance').value= a.endurance|| '';
  document.getElementById('f-hr').value       = a.hr|| '';
  document.getElementById('f-bodyfat').value  = a.bodyfat|| '';
  document.getElementById('f-muscle').value   = a.muscle|| '';
  document.getElementById('f-flexibility').value= a.flexibility|| '';
  document.getElementById('f-notes').value    = a.notes|| '';

  // Photo
  if (a.photo) {
    editPhotoData = a.photo;
    const prev = document.getElementById('photo-preview');
    prev.src = a.photo; prev.classList.remove('hidden');
    document.getElementById('photo-placeholder').classList.add('hidden');
  }

  // Videos
  editVideos = a.videos ? [...a.videos] : [];
  renderVideoPreview();
}

function resetAthleteForm() {
  document.getElementById('f-edit-id').value = '';
  ['f-name','f-age','f-sport','f-email','f-country',
   'f-height','f-weight','f-armspan','f-leglength','f-chest','f-waist',
   'f-sprint','f-jump','f-vo2','f-speed','f-strength','f-endurance',
   'f-hr','f-bodyfat','f-muscle','f-flexibility','f-notes'
  ].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  editPhotoData = null;
  editVideos = [];

  const prev = document.getElementById('photo-preview');
  prev.src = ''; prev.classList.add('hidden');
  document.getElementById('photo-placeholder').classList.remove('hidden');
  document.getElementById('video-preview-list').innerHTML = '';
}

/* ══════════════════════════════════════════════════════════
   ATHLETE DETAIL MODAL
   ══════════════════════════════════════════════════════════ */
function openAthleteModal(id) {
  const a = athletes.find(a => a.id === id);
  if (!a) return;
  openAthleteId = id;

  // Hero
  const photoEl = document.getElementById('modal-photo');
  if (a.photo) {
    photoEl.src = a.photo;
    photoEl.style.display = 'block';
  } else {
    photoEl.style.display = 'none';
  }

  document.getElementById('modal-sport').textContent       = a.sport || '—';
  document.getElementById('modal-name').textContent        = a.name  || '—';
  document.getElementById('modal-age-country').textContent =
    [a.age ? `${a.age} yrs` : '', a.country].filter(Boolean).join(' · ');

  // Overview
  setText('md-height',    a.height    ? `${a.height} cm`  : '—');
  setText('md-weight',    a.weight    ? `${a.weight} kg`  : '—');
  setText('md-armspan',   a.armspan   ? `${a.armspan} cm` : '—');
  setText('md-leglength', a.leglength ? `${a.leglength} cm` : '—');
  setText('md-chest',     a.chest     ? `${a.chest} cm`   : '—');
  setText('md-waist',     a.waist     ? `${a.waist} cm`   : '—');
  setText('md-email',     a.email     || '—');
  setText('md-notes',     a.notes     || '—');

  // Physiology
  setText('md-hr',          a.hr          ? `${a.hr} bpm`        : '—');
  setText('md-bodyfat',     a.bodyfat     ? `${a.bodyfat}%`      : '—');
  setText('md-muscle',      a.muscle      ? `${a.muscle} kg`     : '—');
  setText('md-flexibility', a.flexibility ? `${a.flexibility}/100` : '—');
  setText('md-vo2',         a.vo2         ? `${a.vo2} ml/kg/min` : '—');
  setText('md-speed',       a.speed       ? `${a.speed} km/h`    : '—');

  // Performance bars
  const perfContainer = document.getElementById('modal-perf-bars');
  const perfItems = [
    { label: '100m Sprint',     val: a.sprint,    unit: 's',   max: 15,  invert: true },
    { label: 'Vertical Jump',   val: a.jump,      unit: 'cm',  max: 100 },
    { label: 'Max Speed',       val: a.speed,     unit: 'km/h',max: 40  },
    { label: 'Strength Score',  val: a.strength,  unit: '/100',max: 100 },
    { label: 'Endurance Score', val: a.endurance, unit: '/100',max: 100 },
    { label: 'Flexibility',     val: a.flexibility,unit:'/100',max: 100 },
  ];

  perfContainer.innerHTML = perfItems.map(p => {
    if (!p.val) return '';
    const v = parseFloat(p.val);
    let pct = (v / p.max) * 100;
    if (p.invert) pct = 100 - pct; // lower sprint time = better
    pct = Math.min(Math.max(pct, 3), 100);
    return `
      <div class="perf-row">
        <div class="perf-label">
          <span>${p.label}</span>
          <span>${p.val}${p.unit}</span>
        </div>
        <div class="perf-track">
          <div class="perf-fill" style="width:${pct}%"></div>
        </div>
      </div>`;
  }).join('');

  // Media
  const mediaContainer = document.getElementById('modal-media-content');
  let mediaHTML = '';
  if (a.photo) {
    mediaHTML += `<img src="${a.photo}" alt="${esc(a.name)}" style="border-radius:8px;object-fit:cover;aspect-ratio:16/9;width:100%"/>`;
  }
  (a.videos||[]).forEach(v => {
    mediaHTML += `<video src="${v.data}" controls style="border-radius:8px;background:#000;width:100%"></video>`;
  });
  if (!mediaHTML) mediaHTML = '<p style="color:var(--text-3);font-size:13px;">No media uploaded.</p>';
  mediaContainer.innerHTML = mediaHTML;

  // Reset tab
  switchModalTab('overview', document.querySelector('.modal-tab'));

  document.getElementById('athlete-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeAthleteModal() {
  document.getElementById('athlete-modal').classList.add('hidden');
  document.body.style.overflow = '';
  openAthleteId = null;
}

function closeModalOnOverlay(event) {
  if (event.target === document.getElementById('athlete-modal')) closeAthleteModal();
}

function switchModalTab(tabId, btn) {
  document.querySelectorAll('.modal-tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById(`modal-tab-${tabId}`).classList.add('active');
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function editAthleteFromModal() {
  closeAthleteModal();
  if (openAthleteId) editAthlete(openAthleteId);
  // openAthleteId is cleared above — reuse before clearing
}

function deleteAthleteFromModal() {
  if (!openAthleteId) return;
  if (!confirm('Delete this athlete?')) return;
  const id = openAthleteId;
  closeAthleteModal();
  deleteAthlete(id, null);
  navigate('athletes');
}

/* ══════════════════════════════════════════════════════════
   ANALYTICS
   ══════════════════════════════════════════════════════════ */
function renderAnalytics() {
  renderSportChart();
  renderAgeChart();
  renderHeightWeightScatter();
  renderSpeedChart();
  renderScoreChart();
  renderVo2Chart();
}

function renderSportChart() {
  const container = document.getElementById('chart-sports');
  const dist = sportCounts();
  const max  = Math.max(...Object.values(dist), 1);
  const sorted = Object.entries(dist).sort((a,b) => b[1]-a[1]);

  if (!sorted.length) { container.innerHTML = emptyChart(); return; }

  container.innerHTML = sorted.map(([sport, count]) => `
    <div class="bar-row">
      <span class="bar-label">${esc(sport)}</span>
      <div class="bar-track">
        <div class="bar-fill" style="width:${(count/max)*100}%; background:${SPORT_COLORS[sport]||'var(--accent)'}"></div>
      </div>
      <span class="bar-val">${count}</span>
    </div>
  `).join('');
}

function renderAgeChart() {
  const container = document.getElementById('chart-age');
  const ages = athletes.map(a => +a.age).filter(Boolean);
  if (!ages.length) { container.innerHTML = emptyChart(); return; }

  // Bucket into groups
  const buckets = { '< 15': 0, '15–17': 0, '18–20': 0, '21–24': 0, '25+': 0 };
  ages.forEach(a => {
    if (a < 15) buckets['< 15']++;
    else if (a <= 17) buckets['15–17']++;
    else if (a <= 20) buckets['18–20']++;
    else if (a <= 24) buckets['21–24']++;
    else buckets['25+']++;
  });

  const max = Math.max(...Object.values(buckets), 1);
  container.innerHTML = Object.entries(buckets).map(([k, v]) => `
    <div class="bar-row">
      <span class="bar-label">${k}</span>
      <div class="bar-track">
        <div class="bar-fill" style="width:${(v/max)*100}%; background:var(--accent-3)"></div>
      </div>
      <span class="bar-val">${v}</span>
    </div>
  `).join('');
}

function renderHeightWeightScatter() {
  const container = document.getElementById('chart-hw');
  const data = athletes.filter(a => a.height && a.weight);
  if (!data.length) { container.innerHTML = emptyChart(); return; }

  const heights = data.map(a => +a.height);
  const weights = data.map(a => +a.weight);
  const minH = Math.min(...heights), maxH = Math.max(...heights);
  const minW = Math.min(...weights), maxW = Math.max(...weights);

  container.innerHTML = data.map(a => {
    const x = pct(+a.height, minH, maxH);
    const y = 100 - pct(+a.weight, minW, maxW);
    return `<div class="scatter-point" title="${esc(a.name)}: ${a.height}cm / ${a.weight}kg"
      style="left:${x}%; top:${y}%; background:${SPORT_COLORS[a.sport]||'var(--accent)'}"></div>`;
  }).join('');
}

function renderSpeedChart() {
  const container = document.getElementById('chart-speed');
  const data = athletes.filter(a => a.speed)
    .map(a => ({ name: a.name, val: +a.speed }))
    .sort((a,b) => b.val - a.val).slice(0, 8);

  if (!data.length) { container.innerHTML = emptyChart(); return; }
  const max = data[0].val;

  container.innerHTML = data.map(d => `
    <div class="bar-row">
      <span class="bar-label" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(d.name.split(' ')[0])}</span>
      <div class="bar-track">
        <div class="bar-fill" style="width:${(d.val/max)*100}%; background:var(--success)"></div>
      </div>
      <span class="bar-val">${d.val}</span>
    </div>
  `).join('');
}

function renderScoreChart() {
  const container = document.getElementById('chart-scores');
  const fields = [
    { label: 'Strength',    key: 'strength' },
    { label: 'Endurance',   key: 'endurance' },
    { label: 'Flexibility', key: 'flexibility' },
  ];

  const colors = ['var(--accent)', 'var(--accent-3)', 'var(--success)'];

  container.innerHTML = fields.map((f, i) => {
    const vals = athletes.map(a => +a[f.key]).filter(Boolean);
    const a = vals.length ? Math.round(avg(vals)) : 0;
    return `
      <div class="score-row">
        <span class="score-label">${f.label}</span>
        <div class="score-bar">
          <div class="score-fill" style="width:${a}%; background:${colors[i]}"></div>
        </div>
        <span class="score-val">${a || '—'}</span>
      </div>`;
  }).join('');
}

function renderVo2Chart() {
  const container = document.getElementById('chart-vo2');
  const data = athletes.filter(a => a.vo2)
    .map(a => ({ name: a.name, val: +a.vo2 }))
    .sort((a,b) => b.val - a.val).slice(0, 6);

  if (!data.length) { container.innerHTML = emptyChart(); return; }
  const max = data[0].val;

  container.innerHTML = data.map(d => `
    <div class="bar-row">
      <span class="bar-label">${esc(d.name.split(' ')[0])}</span>
      <div class="bar-track">
        <div class="bar-fill" style="width:${(d.val/max)*100}%; background:var(--warn)"></div>
      </div>
      <span class="bar-val">${d.val}</span>
    </div>
  `).join('');
}

function emptyChart() {
  return '<p style="color:var(--text-3);font-size:13px;text-align:center;padding:20px">No data available yet.</p>';
}

/* ══════════════════════════════════════════════════════════
   MEDIA
   ══════════════════════════════════════════════════════════ */
function renderMedia() {
  renderMediaPhotos();
  renderMediaVideos();
}

function renderMediaPhotos() {
  const container = document.getElementById('media-photos');
  const withPhoto = athletes.filter(a => a.photo);

  if (!withPhoto.length) {
    container.innerHTML = '<div class="media-empty">No photos yet. Add athletes with profile photos.</div>';
    return;
  }

  container.innerHTML = withPhoto.map(a => `
    <div class="photo-thumb" onclick="openAthleteModal('${a.id}')">
      <img src="${a.photo}" alt="${esc(a.name)}" loading="lazy"/>
      <div class="photo-thumb-label">${esc(a.name)}</div>
    </div>
  `).join('');
}

function renderMediaVideos() {
  const container = document.getElementById('media-videos');
  const withVideo = athletes.filter(a => a.videos && a.videos.length);

  if (!withVideo.length) {
    container.innerHTML = '<div class="media-empty">No videos yet. Upload performance videos when adding athletes.</div>';
    return;
  }

  let html = '';
  withVideo.forEach(a => {
    a.videos.forEach(v => {
      html += `
        <div class="video-item">
          <video src="${v.data}" controls preload="metadata"></video>
          <div class="video-item-info">
            <div class="video-item-name">${esc(a.name)}</div>
            <div class="video-item-meta">${esc(a.sport)} · ${esc(v.name)}</div>
          </div>
        </div>`;
    });
  });

  container.innerHTML = html;
}

function switchMediaTab(tab, btn) {
  document.getElementById('media-photos').classList.toggle('hidden', tab !== 'photos');
  document.getElementById('media-videos').classList.toggle('hidden', tab !== 'videos');
  document.querySelectorAll('.media-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
}

/* ══════════════════════════════════════════════════════════
   TOAST
   ══════════════════════════════════════════════════════════ */
let toastTimer = null;

function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  el.className = `toast ${type}`;
  el.classList.remove('hidden');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3500);
}

/* ══════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════ */
function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
}

function avg(arr) {
  if (!arr || !arr.length) return 0;
  return arr.reduce((s,v) => s + v, 0) / arr.length;
}

function pct(val, min, max) {
  if (max === min) return 50;
  return ((val - min) / (max - min)) * 100;
}

function sportCounts() {
  const dist = {};
  athletes.forEach(a => { dist[a.sport] = (dist[a.sport] || 0) + 1; });
  return dist;
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = e => resolve(e.target.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/* ══════════════════════════════════════════════════════════
   SAMPLE DATA (seeds on first launch)
   ══════════════════════════════════════════════════════════ */
function getSampleAthletes() {
  return [
    {
      id: 'athlete_001',
      name: 'Kofi Mensah',       age: '17', sport: 'Athletics',
      email: 'kofi@example.com', country: 'Ghana',
      height: '182', weight: '73',
      armspan: '186', leglength: '96', chest: '94', waist: '78',
      sprint: '10.8', jump: '72', vo2: '58.2', speed: '31.2',
      strength: '78', endurance: '85', flexibility: '70',
      hr: '54', bodyfat: '9.2', muscle: '41.5',
      notes: 'Exceptional sprint times for his age. National youth champion 2023.',
      photo: null, videos: [], createdAt: Date.now() - 86400000*5,
    },
    {
      id: 'athlete_002',
      name: 'Amara Diallo',      age: '19', sport: 'Football',
      email: 'amara@example.com',country: 'Senegal',
      height: '176', weight: '69',
      armspan: '180', leglength: '92', chest: '91', waist: '76',
      sprint: '11.1', jump: '68', vo2: '55.4', speed: '29.8',
      strength: '72', endurance: '80', flexibility: '76',
      hr: '58', bodyfat: '11.1', muscle: '38.2',
      notes: 'Left-footed midfielder. Strong vision and tactical awareness.',
      photo: null, videos: [], createdAt: Date.now() - 86400000*4,
    },
    {
      id: 'athlete_003',
      name: 'Fatima Al-Rashid',  age: '16', sport: 'Swimming',
      email: 'fatima@example.com',country: 'Morocco',
      height: '169', weight: '58',
      armspan: '172', leglength: '88', chest: '84', waist: '68',
      sprint: '12.0', jump: '55', vo2: '52.1', speed: '24.5',
      strength: '64', endurance: '88', flexibility: '92',
      hr: '52', bodyfat: '14.8', muscle: '32.1',
      notes: '100m freestyle champion at regional level. Promising technique.',
      photo: null, videos: [], createdAt: Date.now() - 86400000*3,
    },
    {
      id: 'athlete_004',
      name: 'Emeka Okafor',      age: '20', sport: 'Basketball',
      email: 'emeka@example.com', country: 'Nigeria',
      height: '196', weight: '87',
      armspan: '204', leglength: '106', chest: '102', waist: '86',
      sprint: '11.4', jump: '82', vo2: '50.3', speed: '27.4',
      strength: '88', endurance: '72', flexibility: '65',
      hr: '62', bodyfat: '10.4', muscle: '47.8',
      notes: 'Power forward with elite wingspan. Needs work on 3-point shooting.',
      photo: null, videos: [], createdAt: Date.now() - 86400000*2,
    },
    {
      id: 'athlete_005',
      name: 'Aisha Kamara',      age: '18', sport: 'Athletics',
      email: 'aisha@example.com', country: 'Sierra Leone',
      height: '171', weight: '61',
      armspan: '174', leglength: '90', chest: '86', waist: '70',
      sprint: '11.6', jump: '62', vo2: '54.7', speed: '28.9',
      strength: '65', endurance: '82', flexibility: '88',
      hr: '55', bodyfat: '13.2', muscle: '33.8',
      notes: 'Long jump specialist. Strong explosive power in approach run.',
      photo: null, videos: [], createdAt: Date.now() - 86400000,
    },
    {
      id: 'athlete_006',
      name: 'Théo Nkosi',        age: '21', sport: 'Rugby',
      email: 'theo@example.com',  country: 'South Africa',
      height: '188', weight: '95',
      armspan: '194', leglength: '100', chest: '110', waist: '88',
      sprint: '11.8', jump: '70', vo2: '48.5', speed: '26.3',
      strength: '94', endurance: '68', flexibility: '58',
      hr: '66', bodyfat: '12.8', muscle: '54.2',
      notes: 'Flanker with elite tackle rate. Needs conditioning for 80-min games.',
      photo: null, videos: [], createdAt: Date.now() - 3600000,
    },
  ];
}