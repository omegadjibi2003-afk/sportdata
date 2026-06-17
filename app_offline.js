/**
 * ═══════════════════════════════════════════════════════════
 *  SPORTDATA v3 — app_supabase.js
 *  Version Production avec Supabase
 *
 *  INSTALLATION (4 étapes) :
 *  ─────────────────────────────────────────────────────────
 *  1. Créez un projet sur https://supabase.com (gratuit)
 *  2. SQL Editor → Collez supabase_schema.sql → Run
 *  3. Remplacez SUPABASE_URL et SUPABASE_ANON ci-dessous
 *     (Dashboard → Settings → API)
 *  4. Dans index.html, remplacez :
 *       <script src="app.js"></script>
 *     par :
 *       <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *       <script src="app_supabase.js"></script>
 *
 *  Fonctionnalités :
 *  ✅ Auth réelle (email/password sécurisé)
 *  ✅ Base de données PostgreSQL cloud
 *  ✅ Photos/vidéos sur CDN Supabase Storage
 *  ✅ Données synchronisées sur tous appareils
 *  ✅ Sécurité par utilisateur (Row Level Security)
 *  ✅ PIN admin + logs d'accès en BDD
 *  ✅ Notifications persistantes
 * ═══════════════════════════════════════════════════════════
 */
'use strict';

/* ═══════════════════════════════════════════════════════════
   SPORTDATA — COUCHE OFFLINE/ONLINE HYBRIDE
   
   Mode ONLINE  : données dans Supabase (cloud)
   Mode OFFLINE : données dans localStorage
   Sync auto    : quand le réseau revient, sync vers Supabase
   ═══════════════════════════════════════════════════════════ */

/* ── ÉTAT RÉSEAU ─────────────────────────────────────────── */
let isOnline        = navigator.onLine;
let syncPending     = false;
let offlineQueue    = [];  // Actions à synchroniser quand réseau revient

/* ── CLÉS OFFLINE ────────────────────────────────────────── */
const OFK = {
  ATHLETES:    'sportdata_offline_athletes',
  HISTORY:     'sportdata_offline_history',
  QUEUE:       'sportdata_offline_queue',
  LAST_SYNC:   'sportdata_last_sync',
};

/* ── DÉTECTION RÉSEAU ────────────────────────────────────── */
window.addEventListener('online',  () => { isOnline = true;  onNetworkChange(true);  });
window.addEventListener('offline', () => { isOnline = false; onNetworkChange(false); });

async function onNetworkChange(online) {
  updateNetworkBanner(online);
  if (online && currentUser) {
    await syncOfflineToSupabase();
  }
}

function updateNetworkBanner(online) {
  let banner = document.getElementById('network-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'network-banner';
    banner.style.cssText = [
      'position:fixed;top:0;left:0;right:0;z-index:99999',
      'padding:8px 16px;text-align:center;font-size:13px;font-weight:600',
      'transition:all .3s;font-family:var(--font-body)',
    ].join(';');
    document.body.appendChild(banner);
  }
  if (online) {
    banner.style.background = 'rgba(52,211,153,0.15)';
    banner.style.color      = '#34d399';
    banner.style.borderBottom = '1px solid rgba(52,211,153,0.3)';
    banner.textContent = '✓ Connecté — données synchronisées avec Supabase';
    setTimeout(() => { banner.style.display = 'none'; }, 3000);
  } else {
    banner.style.display    = 'block';
    banner.style.background = 'rgba(251,191,36,0.15)';
    banner.style.color      = '#fbbf24';
    banner.style.borderBottom = '1px solid rgba(251,191,36,0.3)';
    banner.textContent = '⚡ Mode hors-ligne — données sauvegardées localement';
  }
}

/* ── STORAGE LOCAL ───────────────────────────────────────── */
function getOfflineData(key) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; }
  catch { return null; }
}
function setOfflineData(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function addToQueue(action) {
  const queue = getOfflineData(OFK.QUEUE) || [];
  queue.push({ ...action, timestamp: Date.now(), id: crypto.randomUUID() });
  setOfflineData(OFK.QUEUE, queue);
}

/* ── CHARGEMENT HYBRIDE ──────────────────────────────────── */
async function loadAthletesHybrid() {
  if (isOnline && currentUser) {
    try {
      // Charger depuis Supabase
      const { data, error } = await db.from('athletes')
        .select('*').eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      if (!error && data) {
        athletes = data.map(dbToAthlete);
        // Sauvegarder en local pour offline
        setOfflineData(OFK.ATHLETES, athletes);
        setOfflineData(OFK.LAST_SYNC, Date.now());
        return;
      }
    } catch(e) { console.warn('Supabase indisponible, mode offline'); }
  }
  // Fallback offline
  const cached = getOfflineData(OFK.ATHLETES) || [];
  athletes = cached;
  if (!isOnline) updateNetworkBanner(false);
}

async function loadAllHistoryHybrid() {
  if (isOnline && currentUser) {
    try {
      const { data, error } = await db.from('performance_history')
        .select('*').eq('user_id', currentUser.id)
        .order('entry_date', { ascending: true });
      if (!error && data) {
        historyData = {};
        (data || []).forEach(r => {
          if (!historyData[r.athlete_id]) historyData[r.athlete_id] = [];
          historyData[r.athlete_id].push(dbToHistory(r));
        });
        setOfflineData(OFK.HISTORY, historyData);
        return;
      }
    } catch(e) { console.warn('Historique: mode offline'); }
  }
  historyData = getOfflineData(OFK.HISTORY) || {};
}

/* ── SAUVEGARDE HYBRIDE ──────────────────────────────────── */
async function saveAthleteHybrid(dbData, editId) {
  const isEdit = !!editId;

  // Sauvegarder localement IMMÉDIATEMENT (offline-first)
  const localAthlete = dbToAthlete({ ...dbData, id: dbData.id, created_at: new Date().toISOString() });
  const localAthletes = getOfflineData(OFK.ATHLETES) || [];
  const idx = localAthletes.findIndex(a => a.id === dbData.id);
  if (idx >= 0) localAthletes[idx] = localAthlete;
  else localAthletes.unshift(localAthlete);
  setOfflineData(OFK.ATHLETES, localAthletes);
  athletes = localAthletes;

  if (isOnline) {
    try {
      const { error } = isEdit
        ? await db.from('athletes').update(dbData).eq('id', editId)
        : await db.from('athletes').insert(dbData);
      if (!error) {
        setOfflineData(OFK.LAST_SYNC, Date.now());
        return { error: null };
      }
    } catch(e) { /* réseau coupé pendant l'opération */ }
  }

  // Ajouter à la queue de synchronisation
  addToQueue({ type: isEdit ? 'update' : 'insert', table: 'athletes', data: dbData, id: dbData.id });
  toast('💾 Sauvegardé localement — sera synchronisé en ligne', 'info');
  return { error: null };
}

async function deleteAthleteHybrid(id) {
  // Supprimer localement
  const localAthletes = getOfflineData(OFK.ATHLETES) || [];
  const filtered = localAthletes.filter(a => a.id !== id);
  setOfflineData(OFK.ATHLETES, filtered);
  athletes = filtered;

  if (isOnline) {
    try {
      await db.from('performance_history').delete().eq('athlete_id', id);
      await db.from('athletes').delete().eq('id', id);
      return;
    } catch(e) {}
  }
  addToQueue({ type: 'delete', table: 'athletes', id });
}

async function saveHistoryHybrid(entry) {
  // Sauvegarder localement
  const localHistory = getOfflineData(OFK.HISTORY) || {};
  if (!localHistory[entry.athlete_id]) localHistory[entry.athlete_id] = [];
  const localEntry = {
    id: entry.id || crypto.randomUUID(),
    date: entry.entry_date, note: entry.note || '',
    weight: String(entry.weight||''), sprint: String(entry.sprint||''),
    vo2: String(entry.vo2||''), speed: String(entry.speed||''),
    strength: String(entry.strength||''), endurance: String(entry.endurance||''),
  };
  localHistory[entry.athlete_id].push(localEntry);
  setOfflineData(OFK.HISTORY, localHistory);
  historyData = localHistory;

  if (isOnline) {
    try {
      const { error } = await db.from('performance_history').insert(entry);
      if (!error) return { error: null };
    } catch(e) {}
  }
  addToQueue({ type: 'insert', table: 'performance_history', data: entry });
  toast('💾 Mesure sauvegardée localement', 'info');
  return { error: null };
}

/* ── SYNCHRONISATION ─────────────────────────────────────── */
async function syncOfflineToSupabase() {
  const queue = getOfflineData(OFK.QUEUE) || [];
  if (!queue.length) return;

  syncPending = true;
  toast(`🔄 Synchronisation de ${queue.length} action(s)…`, 'info');

  const failed = [];
  for (const action of queue) {
    try {
      if (action.table === 'athletes') {
        if (action.type === 'insert') await db.from('athletes').upsert(action.data);
        else if (action.type === 'update') await db.from('athletes').update(action.data).eq('id', action.id);
        else if (action.type === 'delete') await db.from('athletes').delete().eq('id', action.id);
      } else if (action.table === 'performance_history') {
        await db.from('performance_history').upsert(action.data);
      }
    } catch(e) {
      failed.push(action);
    }
  }

  setOfflineData(OFK.QUEUE, failed);
  syncPending = false;

  if (!failed.length) {
    toast(`✅ ${queue.length} action(s) synchronisée(s) !`, 'success');
    // Recharger depuis Supabase
    await loadAthletesHybrid();
    await loadAllHistoryHybrid();
    renderDashboard();
  } else {
    toast(`⚠️ ${failed.length} action(s) non synchronisée(s)`, 'error');
  }
}

/* ── INDICATEUR OFFLINE DANS PARAMÈTRES ──────────────────── */
function getOfflineStatus() {
  const queue  = getOfflineData(OFK.QUEUE) || [];
  const last   = getOfflineData(OFK.LAST_SYNC);
  const cached = getOfflineData(OFK.ATHLETES) || [];
  return {
    isOnline,
    pendingSync: queue.length,
    lastSync: last ? new Date(last).toLocaleString('fr-FR') : 'Jamais',
    cachedAthletes: cached.length,
  };
}


/* ══ CONFIGURATION ══════════════════════════════════════════
   ⚠️  Remplacez ces deux valeurs par les vôtres
   Dashboard Supabase → Settings → API
   ═══════════════════════════════════════════════════════════ */
const SUPABASE_URL  = 'https://xmajjadlogqmfprjxmnc.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtYWpqYWRsb2dxbWZwcmp4bW5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MzgxMDQsImV4cCI6MjA5NjQxNDEwNH0.bmNOHgtHJztWGCXKn7T9gAcqc_SS8NxROABq2UbD4oM';

/* Initialisation du client Supabase */
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: true, autoRefreshToken: true },
});

/* ══ STATE ══════════════════════════════════════════════════ */
let currentUser      = null;
let athletes         = [];
let historyData      = {};
let editPhotoData    = null;   // preview local base64
let editPhotoFile    = null;   // File object pour upload
let editVideos       = [];     // [{name, data}] urls ou previews
let editVideoFiles   = [];     // File[] pour upload
let openAthleteId    = null;
let historyAthleteId = null;
let currentPage      = 'dashboard';
let pinVerified      = false;
let pinLockTimer     = null;
let progressionYearFilter = 'all';
let progressionAthleteId  = null;
let _pinCallback     = null;
let _pinRequiredLevel= 'admin';
let _pinAttempts     = 0;
let _pinBlockedUntil = 0;
let _pinDigits       = [];
let toastT           = null;


/* ══ LOADING SPINNER ════════════════════════════════════════ */
function showLoading(show) {
  let el = document.getElementById('sd-loading');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sd-loading';
    el.style.cssText = [
      'position:fixed;inset:0;z-index:9999',
      'background:rgba(10,15,30,.85);backdrop-filter:blur(6px)',
      'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px'
    ].join(';');
    el.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 36 36" fill="none"
        style="animation:sdSpin 1s linear infinite">
        <polygon points="18,2 34,10 34,26 18,34 2,26 2,10"
          fill="none" stroke="#22d3ee" stroke-width="2"/>
        <circle cx="18" cy="18" r="4" fill="#22d3ee"/>
      </svg>
      <p style="color:#94a3b8;font-size:14px;font-family:'DM Sans',sans-serif" id="sd-loading-msg">
        Chargement…
      </p>
      <style>@keyframes sdSpin{to{transform:rotate(360deg)}}</style>`;
    document.body.appendChild(el);
  }
  el.style.display = show ? 'flex' : 'none';
}
function setLoadingMsg(msg) {
  const el = document.getElementById('sd-loading-msg');
  if (el) el.textContent = msg;
}

/* ══ INITIALISATION ═════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  showLoading(true);
  setLoadingMsg('Connexion à Supabase…');

  // Vérifier config
  if (SUPABASE_URL.includes('VOTRE_PROJECT_ID') || SUPABASE_URL === '') {
    showLoading(false);
    showConfigError();
    return;
  }

  // Vérifier session existante
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    currentUser = await loadProfile(session.user);
    await bootApp();
  } else {
    showLoading(false);
  }

  // Écouter changements auth
  db.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      currentUser = await loadProfile(session.user);
      await bootApp();
    } else if (event === 'SIGNED_OUT') {
      currentUser = null; athletes = []; historyData = {};
      pinVerified = false;
      if (pinLockTimer) clearTimeout(pinLockTimer);
      document.getElementById('app').classList.add('hidden');
      document.getElementById('auth-overlay').style.display = 'flex';
      showScreen('login');
    }
  });

  // Clavier global
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeAthleteModal(); closeHistoryModal();
      const qsb = document.getElementById('quick-search-bar');
      if (qsb && !qsb.classList.contains('hidden')) toggleSearch();
      const pin = document.getElementById('pin-modal');
      if (pin && !pin.classList.contains('hidden')) closePinModal();
    }
    const pin = document.getElementById('pin-modal');
    if (pin && !pin.classList.contains('hidden')) {
      if (e.key >= '0' && e.key <= '9') { pinKeyPress(e.key); e.preventDefault(); }
      if (e.key === 'Backspace') { pinKeyPress('del'); e.preventDefault(); }
    }
  });
});

function showConfigError() {
  document.body.innerHTML = `
    <div style="min-height:100vh;background:#0a0f1e;display:flex;align-items:center;
      justify-content:center;font-family:'DM Sans',sans-serif;padding:24px">
      <div style="max-width:500px;text-align:center">
        <svg width="60" height="60" viewBox="0 0 36 36" fill="none" style="margin-bottom:20px">
          <polygon points="18,2 34,10 34,26 18,34 2,26 2,10" fill="none" stroke="#22d3ee" stroke-width="2"/>
          <circle cx="18" cy="18" r="4" fill="#22d3ee"/>
        </svg>
        <h1 style="color:#f1f5f9;font-size:22px;margin-bottom:12px">Configuration Supabase requise</h1>
        <p style="color:#94a3b8;margin-bottom:24px;line-height:1.6">
          Vous devez configurer vos clés Supabase dans <code style="background:#1e293b;
          padding:2px 8px;border-radius:4px;color:#22d3ee">app_supabase.js</code>
        </p>
        <div style="background:#1e293b;border:1px solid rgba(255,255,255,.1);border-radius:12px;
          padding:20px;text-align:left;font-size:13px;color:#94a3b8;line-height:2">
          <strong style="color:#f1f5f9">Étapes :</strong><br>
          1. Créez un projet sur <a href="https://supabase.com" target="_blank"
            style="color:#22d3ee">supabase.com</a><br>
          2. Exécutez <code style="color:#22d3ee">supabase_schema.sql</code> dans SQL Editor<br>
          3. Copiez vos clés API dans <code style="color:#22d3ee">app_supabase.js</code> lignes 35-36<br>
          4. Rechargez la page
        </div>
      </div>
    </div>`;
}

/* ══ AUTH ═══════════════════════════════════════════════════ */
function showScreen(s) {
  document.querySelectorAll('.auth-screen').forEach(x => x.classList.remove('active'));
  const el = document.getElementById('screen-' + s);
  if (el) el.classList.add('active');
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');
  if (!email || !pass) { showErr(errEl, 'Veuillez remplir tous les champs.'); return; }

  const loginBtn = document.querySelector('#screen-login .btn-primary');
  if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = 'Connexion…'; }

  const { error } = await db.auth.signInWithPassword({ email, password: pass });

  if (loginBtn) { loginBtn.disabled = false; loginBtn.innerHTML = '<span>Se connecter</span>'; }

  if (error) {
    showErr(errEl, 'Email ou mot de passe incorrect.');
  }
  // succès géré par onAuthStateChange
}

async function handleSignup() {
  const fname = document.getElementById('signup-fname').value.trim();
  const lname = document.getElementById('signup-lname').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass  = document.getElementById('signup-password').value;
  const org   = document.getElementById('signup-org').value.trim();
  const errEl = document.getElementById('signup-error');
  errEl.classList.add('hidden');

  if (!fname||!lname||!email||!pass) {
    showErr(errEl, 'Veuillez remplir tous les champs obligatoires.'); return;
  }
  if (pass.length < 6) {
    showErr(errEl, 'Mot de passe trop court (min. 6 caractères).'); return;
  }

  showLoading(true); setLoadingMsg('Création du compte…');

  const { error } = await db.auth.signUp({
    email, password: pass,
    options: { data: { fname, lname, org, role: 'scout' } }
  });

  showLoading(false);

  if (error) {
    showErr(errEl, 'Erreur : ' + error.message);
  } else {
    errEl.style.background = 'rgba(52,211,153,0.1)';
    errEl.style.borderColor = 'rgba(52,211,153,0.3)';
    errEl.style.color = 'var(--success)';
    errEl.textContent = '✅ Compte créé ! Vérifiez votre email pour confirmer, puis connectez-vous.';
    errEl.classList.remove('hidden');
  }
}

async function handleLogout() {
  showLoading(true);
  await db.auth.signOut();
  showLoading(false);
}

function showErr(el, msg) { el.textContent = msg; el.classList.remove('hidden'); }

/* ══ PROFIL UTILISATEUR ═════════════════════════════════════ */
async function loadProfile(user) {
  const { data } = await db.from('profiles').select('*').eq('id', user.id).single();
  return {
    id:    user.id,
    email: user.email,
    fname: data?.fname || user.user_metadata?.fname || 'Utilisateur',
    lname: data?.lname || user.user_metadata?.lname || '',
    org:   data?.org   || user.user_metadata?.org   || '',
    role:  data?.role  || 'scout',
  };
}

/* ══ BOOT APP ═══════════════════════════════════════════════ */
async function bootApp() {
  setLoadingMsg('Chargement des données…');
  await Promise.all([loadAthletes(), loadAllHistory()]);
  showLoading(false);

  document.getElementById('auth-overlay').style.display = 'none';
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('sidebar-name').textContent =
    `${currentUser.fname} ${currentUser.lname}`;
  document.getElementById('sidebar-avatar').textContent =
    (currentUser.fname[0] || 'A').toUpperCase();
  document.getElementById('sidebar-org').textContent =
    currentUser.org || 'Scout / Coach';

  navigate('dashboard');
  await renderNotifDot();
}

/* ══ CHARGEMENT DONNÉES SUPABASE ════════════════════════════ */
async function loadAthletes() { return loadAthletesHybrid(); }
async function _loadAthletes_supabase() {
  const { data, error } = await db
    .from('athletes')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) { console.error('loadAthletes:', error); return; }
  athletes = (data || []).map(dbToAthlete);
}

async function loadAllHistory() { return loadAllHistoryHybrid(); }
async function _loadAllHistory_supabase() {
  const { data, error } = await db
    .from('performance_history')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('entry_date', { ascending: true });

  if (error) { console.error('loadAllHistory:', error); return; }
  historyData = {};
  (data || []).forEach(r => {
    if (!historyData[r.athlete_id]) historyData[r.athlete_id] = [];
    historyData[r.athlete_id].push(dbToHistory(r));
  });
}

/* ══ CONVERSIONS DB ↔ APP ════════════════════════════════════ */
function dbToAthlete(r) {
  const n = v => (v !== null && v !== undefined) ? String(v) : '';
  return {
    id: r.id, name: r.name, age: n(r.age), sport: r.sport,
    gender: r.gender||'',
    email: r.email||'', country: r.country||'', city: r.city||'', level: r.level||'',
    height: n(r.height), weight: n(r.weight), armspan: n(r.armspan),
    leglength: n(r.leglength), chest: n(r.chest), waist: n(r.waist),
    sprint: n(r.sprint), jump: n(r.jump), vo2: n(r.vo2), speed: n(r.speed),
    strength: n(r.strength), endurance: n(r.endurance),
    hr: n(r.hr), bodyfat: n(r.bodyfat), muscle: n(r.muscle), flexibility: n(r.flexibility),
    notes: r.notes||'',
    photo: r.photo_url || null,
    videos: Array.isArray(r.video_urls) ? r.video_urls : [],
    createdAt: new Date(r.created_at).getTime(),
  };
}

function dbToHistory(r) {
  const n = v => (v !== null && v !== undefined) ? String(v) : '';
  return {
    id: r.id, date: r.entry_date, note: r.note||'',
    weight: n(r.weight), sprint: n(r.sprint), vo2: n(r.vo2),
    speed: n(r.speed), strength: n(r.strength), endurance: n(r.endurance),
  };
}

function athleteToDb(a) {
  const num = x => (x !== '' && x !== null && x !== undefined) ? parseFloat(x) : null;
  return {
    user_id: currentUser.id,
    name: a.name, sport: a.sport,
    age: num(a.age), email: a.email||null, country: a.country||null,
    city: a.city||null, level: a.level||null,
    gender: a.gender||null,
    height: num(a.height), weight: num(a.weight),
    armspan: num(a.armspan), leglength: num(a.leglength),
    chest: num(a.chest), waist: num(a.waist),
    sprint: num(a.sprint), jump: num(a.jump),
    vo2: num(a.vo2), speed: num(a.speed),
    strength: num(a.strength), endurance: num(a.endurance),
    hr: num(a.hr), bodyfat: num(a.bodyfat),
    muscle: num(a.muscle), flexibility: num(a.flexibility),
    notes: a.notes||null,
  };
}

async function upsertAthleteWithFallback(dbData, editId) {
  const primary = editId
    ? await db.from('athletes').update(dbData).eq('id', editId)
    : await db.from('athletes').insert(dbData);
  if (!primary.error) return primary;

  const message = primary.error.message || '';
  if (!message.includes("Could not find the 'gender' column")) {
    return primary;
  }

  return await rawAthleteUpsert(dbData, editId);
}

async function rawAthleteUpsert(dbData, editId) {
  const { data: { session } } = await db.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    return { error: { message: 'Impossible de récupérer le token d’authentification.' } };
  }

  const url = `${SUPABASE_URL}/rest/v1/athletes${editId ? `?id=eq.${encodeURIComponent(editId)}` : ''}`;
  const method = editId ? 'PATCH' : 'POST';
  const headers = {
    apikey: SUPABASE_ANON,
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  const response = await fetch(url, {
    method,
    headers,
    body: JSON.stringify(dbData),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: response.statusText }));
    return { error: { message: err.message || response.statusText } };
  }

  const data = await response.json().catch(() => null);
  return { error: null, data };
}

/* ══ UPLOAD SUPABASE STORAGE ════════════════════════════════ */
async function uploadPhoto(file, athleteId) {
  const ext  = file.name.split('.').pop().toLowerCase();
  const path = `${currentUser.id}/${athleteId}/photo.${ext}`;
  const { error } = await db.storage
    .from('athlete-photos')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) { console.error('uploadPhoto:', error); return null; }
  return db.storage.from('athlete-photos').getPublicUrl(path).data.publicUrl;
}

async function uploadVideo(file, athleteId, idx) {
  const ext  = file.name.split('.').pop().toLowerCase();
  const path = `${currentUser.id}/${athleteId}/video_${idx}_${Date.now()}.${ext}`;
  const { error } = await db.storage
    .from('athlete-videos')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) { console.error('uploadVideo:', error); return null; }
  return {
    name: file.name,
    data: db.storage.from('athlete-videos').getPublicUrl(path).data.publicUrl,
  };
}

async function deleteStorageFiles(athleteId) {
  for (const bucket of ['athlete-photos', 'athlete-videos']) {
    try {
      const { data: files } = await db.storage
        .from(bucket).list(`${currentUser.id}/${athleteId}`);
      if (files?.length) {
        await db.storage.from(bucket)
          .remove(files.map(f => `${currentUser.id}/${athleteId}/${f.name}`));
      }
    } catch(e) { console.warn('deleteStorageFiles:', e); }
  }
}

/* ══ CRUD ATHLÈTES ══════════════════════════════════════════ */
async function saveAthlete() {
  if (!validateAthleteForm()) return;

  const name  = gv('f-name');
  const sport = gv('f-sport');
  const editId = gv('f-edit-id');
  const isEdit = !!editId;
  const athleteId = editId || crypto.randomUUID();

  showLoading(true);
  setLoadingMsg(isEdit ? 'Mise à jour…' : 'Enregistrement…');

  // Upload photo si nouveau fichier
  let photoUrl = editPhotoData; // URL existante ou null
  if (editPhotoFile) {
    setLoadingMsg('Upload photo…');
    photoUrl = await uploadPhoto(editPhotoFile, athleteId);
  }

  // Upload nouvelles vidéos
  let videoUrls = editVideos.filter(v => v.data && v.data.startsWith('http'));
  for (let i = 0; i < editVideoFiles.length; i++) {
    setLoadingMsg(`Upload vidéo ${i+1}/${editVideoFiles.length}…`);
    const result = await uploadVideo(editVideoFiles[i], athleteId, i);
    if (result) videoUrls.push(result);
  }

  const dbData = {
    ...athleteToDb({
      name, sport,
      gender: gv('f-gender'),
      age: gv('f-age'), email: gv('f-email'), country: gv('f-country'),
      city: gv('f-city'), level: gv('f-level'),
      height: gv('f-height'), weight: gv('f-weight'),
      armspan: gv('f-armspan'), leglength: gv('f-leglength'),
      chest: gv('f-chest'), waist: gv('f-waist'),
      sprint: gv('f-sprint'), jump: gv('f-jump'),
      vo2: gv('f-vo2'), speed: gv('f-speed'),
      strength: gv('f-strength'), endurance: gv('f-endurance'),
      hr: gv('f-hr'), bodyfat: gv('f-bodyfat'),
      muscle: gv('f-muscle'), flexibility: gv('f-flexibility'),
      notes: gv('f-notes'),
    }),
    id: athleteId,
    photo_url: photoUrl,
    video_urls: videoUrls,
  };

  const { error } = await saveAthleteHybrid(dbData, editId);

  if (error) {
    showLoading(false);
    toast('Erreur : ' + error.message, 'error');
    console.error(error);
    return;
  }

  setLoadingMsg('Synchronisation…');
  await loadAthletes();
  showLoading(false);

  const msg = isEdit ? `${name} mis à jour !` : `${name} ajouté à l'effectif !`;
  toast(msg, 'success');
  await addNotif(isEdit ? `✏️ ${name} modifié.` : `✅ Nouvel athlète : ${name} (${sport}).`);
  resetAthleteForm();
  navigate('athletes');
}

async function deleteAthlete(id) {
  const a = athletes.find(x => x.id === id);
  const name = a ? a.name : 'Athlète';
  showLoading(true); setLoadingMsg('Suppression…');

  // Supprimer historique lié
  await db.from('performance_history').delete().eq('athlete_id', id);

  // Supprimer l'athlète
  const { error } = await db.from('athletes').delete().eq('id', id);
  if (error) {
    showLoading(false);
    toast('Erreur suppression : ' + error.message, 'error'); return;
  }

  // Supprimer fichiers storage
  await deleteStorageFiles(id);

  await loadAthletes();
  delete historyData[id];
  showLoading(false);

  toast(`${name} supprimé.`, 'error');
  await addNotif(`🗑️ ${name} supprimé de l'effectif.`, 'error');
  renderAthletes(); renderDashboard();
}

function confirmDelete(id, e) {
  if (e) e.stopPropagation();
  openPinModal(() => {
    if (!confirm('Supprimer cet athlète ? Cette action est irréversible.')) return;
    deleteAthlete(id);
  }, 'pdg');
}

/* ══ UPLOAD HANDLERS ════════════════════════════════════════ */
function handlePhotoUpload(e) {
  const file = e.target.files[0]; if (!file) return;
  editPhotoFile = file;
  const reader = new FileReader();
  reader.onload = ev => {
    editPhotoData = ev.target.result;
    const p = document.getElementById('photo-preview');
    p.src = editPhotoData; p.classList.remove('hidden');
    document.getElementById('photo-placeholder').classList.add('hidden');
  };
  reader.readAsDataURL(file);
}

function handleVideoUpload(e) {
  Array.from(e.target.files).forEach(file => {
    editVideoFiles.push(file);
    const url = URL.createObjectURL(file);
    editVideos.push({ name: file.name, data: url });
    renderVideoPreview();
  });
}

/* ══ HISTORIQUE ═════════════════════════════════════════════ */
async function saveHistoryEntry() {
  const id   = document.getElementById('history-athlete-select')?.value;
  const date = document.getElementById('h-date')?.value;
  if (!id)   { toast('Sélectionnez un athlète.', 'error'); return; }
  if (!date) { toast('Choisissez une date.', 'error'); return; }

  const num = field => {
    const val = parseFloat(document.getElementById(field)?.value);
    return isNaN(val) ? null : val;
  };

  const entry = {
    athlete_id: id,
    user_id:    currentUser.id,
    entry_date: date,
    note:       document.getElementById('h-note')?.value || null,
    weight:     num('h-weight'), sprint:    num('h-sprint'),
    vo2:        num('h-vo2'),    speed:     num('h-speed'),
    strength:   num('h-strength'), endurance: num('h-endurance'),
  };

  const { error } = await db.from('performance_history').insert(entry);
  if (error) { toast('Erreur : ' + error.message, 'error'); return; }

  await loadAllHistory();
  closeHistoryModal();
  toast('Mesure enregistrée !', 'success');
  const a = athletes.find(x => x.id === id);
  await addNotif(`📊 Nouvelle mesure pour ${a?.name || 'un athlète'}.`);
  renderHistory();
  if (currentPage === 'progression') renderProgression();
  if (window._progressionRefreshNeeded) {
    window._progressionRefreshNeeded = false;
    renderProgression();
  }
}

async function deleteHistoryEntry(athleteId, date) {
  if (!confirm('Supprimer cette mesure ?')) return;
  const entry = historyData[athleteId]?.find(e => e.date === date);
  if (!entry?.id) {
    // fallback: delete by date
    await db.from('performance_history')
      .delete().eq('athlete_id', athleteId).eq('entry_date', date);
  } else {
    await db.from('performance_history').delete().eq('id', entry.id);
  }
  await loadAllHistory();
  toast('Mesure supprimée.', 'info');
  renderProgression();
}

/* ══ NOTIFICATIONS ══════════════════════════════════════════ */
async function addNotif(msg, type = 'info') {
  await db.from('notifications').insert({
    user_id: currentUser.id, message: msg, type,
  });
  await renderNotifDot();
}

async function renderNotifDot() {
  const { count } = await db
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', currentUser.id)
    .eq('read', false);
  const dot = document.getElementById('notif-dot');
  if (dot) dot.classList.toggle('hidden', !count);
}

async function toggleNotifPanel() {
  const p = document.getElementById('notif-panel');
  p.classList.toggle('hidden');
  if (!p.classList.contains('hidden')) {
    const { data } = await db
      .from('notifications').select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(25);
    const list = document.getElementById('notif-list');
    if (list) {
      list.innerHTML = (data||[]).length
        ? data.map(n => `
            <div class="notif-item">
              ${esc(n.message)}
              <span class="notif-time">${timeAgo(new Date(n.created_at).getTime())}</span>
            </div>`).join('')
        : '<p class="notif-empty">Aucune notification</p>';
    }
    // Marquer comme lu
    await db.from('notifications')
      .update({ read: true })
      .eq('user_id', currentUser.id).eq('read', false);
    await renderNotifDot();
  }
}

async function clearNotifications() {
  await db.from('notifications').delete().eq('user_id', currentUser.id);
  const list = document.getElementById('notif-list');
  if (list) list.innerHTML = '<p class="notif-empty">Aucune notification</p>';
  await renderNotifDot();
}

/* ══ PIN — LOGS SUPABASE ════════════════════════════════════ */
async function logPinAccess(status) {
  await db.from('pin_logs').insert({
    user_id:    currentUser.id,
    user_name:  `${currentUser.fname} ${currentUser.lname}`,
    user_email: currentUser.email,
    status,
    page: 'add-athlete',
  });
}

async function renderPinLogs() {
  const container = document.getElementById('pin-logs-list');
  if (!container) return;

  const { data: logs } = await db
    .from('pin_logs').select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!logs?.length) {
    container.innerHTML = '<p style="color:var(--text-3);font-size:13px;text-align:center;padding:20px">Aucun accès enregistré.</p>';
    return;
  }

  const total   = logs.length;
  const success = logs.filter(l => l.status === 'success').length;
  const fails   = total - success;
  const lastSucc = logs.find(l => l.status === 'success');

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
      <div class="pin-log-stat">
        <span class="pin-log-stat-val">${total}</span>
        <span class="pin-log-stat-label">Total accès</span>
      </div>
      <div class="pin-log-stat" style="border-color:rgba(52,211,153,0.2)">
        <span class="pin-log-stat-val" style="color:var(--success)">${success}</span>
        <span class="pin-log-stat-label">Succès</span>
      </div>
      <div class="pin-log-stat" style="border-color:rgba(248,113,113,0.2)">
        <span class="pin-log-stat-val" style="color:var(--danger)">${fails}</span>
        <span class="pin-log-stat-label">Échecs</span>
      </div>
    </div>
    ${lastSucc ? `<p style="font-size:12px;color:var(--text-3);margin-bottom:12px">
      Dernier accès : <strong style="color:var(--text)">${esc(lastSucc.user_name)}</strong>
      — ${timeAgo(new Date(lastSucc.created_at).getTime())}
    </p>` : ''}
    <div class="pin-log-entries">
      ${logs.map(log => `
        <div class="pin-log-entry ${log.status}">
          <div class="pin-log-icon">
            ${log.status === 'success'
              ? '<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M3 8l4 4 6-6" stroke="#34d399" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
              : '<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M4 4l8 8M12 4l-8 8" stroke="#f87171" stroke-width="1.5" stroke-linecap="round"/></svg>'}
          </div>
          <div class="pin-log-info">
            <span class="pin-log-user">${esc(log.user_name || '—')}</span>
            <span class="pin-log-email">${esc(log.user_email || '—')}</span>
          </div>
          <div class="pin-log-meta">
            <span class="pin-log-status ${log.status}">${log.status === 'success' ? 'Succès' : 'Échec'}</span>
            <span class="pin-log-time">${timeAgo(new Date(log.created_at).getTime())}</span>
          </div>
        </div>`).join('')}
    </div>`;
}

async function clearPinLogs() {
  if (!confirm('Effacer tous les logs d\'accès PIN ?')) return;
  await db.from('pin_logs').delete().eq('user_id', currentUser.id);
  await renderPinLogs();
  toast('Logs PIN effacés.', 'info');
}

/* ══ SETTINGS ═══════════════════════════════════════════════ */
async function renderSettings() {
  if (!currentUser) return;
  const el = id => document.getElementById(id);
  if (el('s-fname')) el('s-fname').value = currentUser.fname || '';
  if (el('s-lname')) el('s-lname').value = currentUser.lname || '';
  if (el('s-org'))   el('s-org').value   = currentUser.org   || '';
  setText('settings-display-name',  `${currentUser.fname} ${currentUser.lname}`);
  setText('settings-display-email', currentUser.email);
  const av = el('settings-avatar-display');
  if (av) av.textContent = (currentUser.fname[0] || 'A').toUpperCase();
  setText('s-athlete-count', athletes.length);
  setText('s-storage-size', 'Supabase Cloud ☁️');
  const last = [...athletes].sort((a,b) => (b.createdAt||0)-(a.createdAt||0))[0];
  setText('s-last-added', last ? timeAgo(last.createdAt) : '—');
  // PIN session status
  const statusEl = el('pin-session-status');
  if (statusEl) {
    statusEl.textContent = pinVerified ? 'Active ✓' : 'Inactive';
    statusEl.style.color = pinVerified ? 'var(--success)' : 'var(--text-3)';
  }
  await renderPinLogs();
}

async function saveSettings() {
  const fname = document.getElementById('s-fname')?.value.trim();
  const lname = document.getElementById('s-lname')?.value.trim();
  const org   = document.getElementById('s-org')?.value.trim();
  if (!fname||!lname) { toast('Prénom et nom obligatoires.', 'error'); return; }

  const { error } = await db.from('profiles')
    .update({ fname, lname, org }).eq('id', currentUser.id);

  if (error) { toast('Erreur : ' + error.message, 'error'); return; }

  currentUser = { ...currentUser, fname, lname, org };
  document.getElementById('sidebar-name').textContent = `${fname} ${lname}`;
  document.getElementById('sidebar-avatar').textContent = fname[0].toUpperCase();
  document.getElementById('sidebar-org').textContent = org || 'Scout / Coach';
  toast('Profil mis à jour !', 'success');
  await renderSettings();
}

async function savePinChange() {
  const current = document.getElementById('pin-current')?.value;
  const newPin  = document.getElementById('pin-new')?.value;
  const confirm2 = document.getElementById('pin-confirm')?.value;
  const errEl   = document.getElementById('pin-change-error');

  const showPinErr = msg => {
    if (errEl) { errEl.textContent = msg; errEl.style.display='block'; }
  };

  if (!current||!newPin||!confirm2) { showPinErr('Tous les champs sont obligatoires.'); return; }

  // Vérification PIN actuel via Supabase (on le vérifie via la session)
  // Pour la demo localStorage on accepte DEFAULT_ADMIN_PIN
  const storedPin = getPinStored('admin');
  if (current !== storedPin) { showPinErr('PIN actuel incorrect.'); return; }
  if (!/^\d{4,8}$/.test(newPin)) { showPinErr('Le PIN doit contenir 4 à 8 chiffres.'); return; }
  if (newPin !== confirm2) { showPinErr('Les deux PIN ne correspondent pas.'); return; }

  setPinStored(newPin);
  toast('PIN modifié !', 'success');
  await addNotif('🔑 PIN administrateur modifié.');
  ['pin-current','pin-new','pin-confirm'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value = '';
  });
  if (errEl) errEl.style.display='none';
  document.getElementById('change-pin-form')?.classList.add('hidden');
}

/* ══ EXPORT / IMPORT ════════════════════════════════════════ */
function exportDataJSON() {
  const data = { athletes, historyData, exportedAt: new Date().toISOString(), version: '3.0-supabase' };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `sportdata_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click(); URL.revokeObjectURL(url);
  toast('Données exportées !', 'success');
}

async function importDataJSON(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async ev => {
    try {
      const d = JSON.parse(ev.target.result);
      if (!d.athletes || !Array.isArray(d.athletes)) throw new Error('Format invalide');
      if (!confirm(`Importer ${d.athletes.length} athlète(s) dans Supabase ?`)) return;

      showLoading(true);
      let imported = 0;
      for (const a of d.athletes) {
        setLoadingMsg(`Import athlète ${++imported}/${d.athletes.length}…`);
        const dbData = {
          ...athleteToDb(a),
          id: a.id,
          photo_url:  a.photo && a.photo.startsWith('http') ? a.photo : null,
          video_urls: (a.videos||[]).filter(v => typeof v === 'object' && v.data?.startsWith('http')),
        };
        await db.from('athletes').upsert(dbData);
      }

      // Importer historique
      if (d.historyData) {
        for (const [athleteId, entries] of Object.entries(d.historyData)) {
          for (const en of entries) {
            const num = x => parseFloat(en[x]) || null;
            await db.from('performance_history').upsert({
              athlete_id: athleteId, user_id: currentUser.id,
              entry_date: en.date, note: en.note||null,
              weight: num('weight'), sprint: num('sprint'),
              vo2: num('vo2'), speed: num('speed'),
              strength: num('strength'), endurance: num('endurance'),
            });
          }
        }
      }

      await Promise.all([loadAthletes(), loadAllHistory()]);
      showLoading(false);
      toast(`${d.athletes.length} athlètes importés !`, 'success');
      navigate('dashboard');
    } catch(err) {
      showLoading(false);
      toast('Fichier JSON invalide.', 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

async function clearAllData() {
  if (!confirm('⚠️ Supprimer TOUS les athlètes et l\'historique ? Irréversible !')) return;
  if (!confirm('Confirmez une seconde fois — action irréversible.')) return;
  showLoading(true);
  await db.from('performance_history').delete().eq('user_id', currentUser.id);
  await db.from('athletes').delete().eq('user_id', currentUser.id);
  await Promise.all([loadAthletes(), loadAllHistory()]);
  showLoading(false);
  toast('Toutes les données supprimées.', 'error');
  navigate('dashboard');
}

/* ══ NAVIGATION ═════════════════════════════════════════════ */
const TITLES = {
  dashboard:'Dashboard', athletes:'Athlètes', 'add-athlete':'Ajouter un athlète',
  progression:'Progression individuelle', analytics:'Analytiques',
  compare:'Comparaison', history:'Historique', media:'Médiathèque',
  reports:'Rapports PDF', settings:'Paramètres',
};

function navigate(page) {
  /* ── Garde PIN : si add-athlete et non vérifié, bloquer ── */
  if (page === 'add-athlete' && pinVerified !== 'admin' && pinVerified !== 'pdg') {
    // Ne pas changer currentPage ni afficher la page
    openPinModal(() => {
      // Ce callback s'exécute UNIQUEMENT après PIN correct
      _showPage('add-athlete');
      resetAthleteForm();
      document.getElementById('form-page-title').textContent = 'Ajouter un athlète';
      document.getElementById('save-btn-text').textContent   = 'Sauvegarder';
      startPinLockTimer();
    }, 'admin');
    return; // Stopper ici — la page ne s'affiche pas
  }

  /* ── Garde PIN : accès Paramètres */
  if (page === 'settings' && pinVerified !== 'pdg') {
    openPinModal(() => {
      _showPage('settings');
      renderSettings();
      startPinLockTimer();
    }, 'pdg');
    return;
  }

  /* ── Navigation normale ── */
  _showPage(page);

  const renderMap = {
    dashboard:   renderDashboard,
    athletes:    renderAthletes,
    analytics:   renderAnalytics,
    compare:     renderComparePage,
    history:     renderHistoryPage,
    media:       renderMedia,
    reports:     renderReportsPage,
    settings:    renderSettings,
    progression: renderProgressionPage,
    'add-athlete': () => {
      resetAthleteForm();
      document.getElementById('form-page-title').textContent = 'Ajouter un athlète';
      document.getElementById('save-btn-text').textContent   = 'Sauvegarder';
      startPinLockTimer();
    },
  };
  if (renderMap[page]) renderMap[page]();
}

/* Affiche une page sans vérification PIN */
function _showPage(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const t = document.getElementById('page-' + page);
  if (t) t.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(i =>
    i.classList.toggle('active', i.dataset.page === page));
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = TITLES[page] || '';
  if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

/* ══ RESET FORM ═════════════════════════════════════════════ */
function resetAthleteForm() {
  document.getElementById('f-edit-id').value = '';
  ['f-name','f-gender','f-age','f-sport','f-email','f-country','f-city','f-level',
   'f-height','f-weight','f-armspan','f-leglength','f-chest','f-waist',
   'f-sprint','f-jump','f-vo2','f-speed','f-strength','f-endurance',
   'f-hr','f-bodyfat','f-muscle','f-flexibility','f-notes'
  ].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });

  editPhotoData = null; editPhotoFile = null;
  editVideos = []; editVideoFiles = [];
  progressionYearFilter = 'all';

  const p = document.getElementById('photo-preview');
  if(p) { p.src=''; p.classList.add('hidden'); }
  const ph = document.getElementById('photo-placeholder');
  if(ph) ph.classList.remove('hidden');
  const vpl = document.getElementById('video-preview-list');
  if(vpl) vpl.innerHTML = '';

  // Reset validation
  document.querySelectorAll('.field-error,.field-ok').forEach(el => {
    el.classList.remove('field-error','field-ok'); el.title='';
  });
  document.querySelectorAll('.field-error-msg').forEach(el => {
    el.classList.remove('visible'); el.textContent='';
  });
  document.getElementById('form-error-banner')?.classList.remove('visible');
  document.getElementById('duplicate-warning')?.classList.remove('visible');
  updateFormProgress();
}

function renderVideoPreview() {
  const c = document.getElementById('video-preview-list'); if(!c) return;
  c.innerHTML = editVideos.map((vd, i) => `
    <div class="video-preview-item">
      <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
        <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.2"/>
        <path d="M6 6l4 2-4 2V6z" fill="currentColor"/>
      </svg>
      <span>${esc(vd.name)}</span>
      <button style="margin-left:auto;background:none;border:none;color:var(--danger);cursor:pointer"
        onclick="editVideos.splice(${i},1);editVideoFiles.splice(${i},1);renderVideoPreview()">✕</button>
    </div>`).join('');
}

function editAthlete(id) {
  const a = athletes.find(x => x.id === id); if(!a) return;
  const proceed = () => {
    _showPage('add-athlete');
    document.getElementById('form-page-title').textContent = "Modifier l'athlète";
    document.getElementById('save-btn-text').textContent   = 'Mettre à jour';
    const map = {
    'edit-id':'id', name:'name', age:'age', sport:'sport', email:'email',
    country:'country', city:'city', level:'level', height:'height', weight:'weight',
    armspan:'armspan', leglength:'leglength', chest:'chest', waist:'waist',
    sprint:'sprint', jump:'jump', vo2:'vo2', speed:'speed',
    strength:'strength', endurance:'endurance', hr:'hr', bodyfat:'bodyfat',
    muscle:'muscle', flexibility:'flexibility', notes:'notes',
  };
  Object.entries(map).forEach(([fid, key]) => {
    const el = document.getElementById('f-'+fid); if(el) el.value = a[key]||'';
  });
  if (a.photo) {
    editPhotoData = a.photo; editPhotoFile = null;
    const p = document.getElementById('photo-preview');
    p.src = a.photo; p.classList.remove('hidden');
    document.getElementById('photo-placeholder').classList.add('hidden');
  }
  editVideos = a.videos ? [...a.videos] : [];
  editVideoFiles = [];
  renderVideoPreview();
  updateFormProgress();
  };

  if (pinVerified === 'admin' || pinVerified === 'pdg') {
    proceed();
    return;
  }

  openPinModal(proceed, 'pdg');
}

/* ══ HELPERS ════════════════════════════════════════════════ */
function esc(s) {
  if(!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function gv(id) { const el=document.getElementById(id); return el?el.value.trim():''; }
function uid()  { return crypto.randomUUID(); }
function initials(n) { if(!n) return '?'; return n.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase(); }
function avg(arr)    { if(!arr||!arr.length) return 0; return arr.reduce((s,v)=>s+v,0)/arr.length; }
function pct(val,mn,mx) { if(mx===mn) return 50; return((val-mn)/(mx-mn))*100; }
function sportCounts()  { const d={}; athletes.forEach(a=>{d[a.sport]=(d[a.sport]||0)+1;}); return d; }
function setText(id,val) { const el=document.getElementById(id); if(el) el.textContent=val; }
function noData() { return '<p style="color:var(--text-3);font-size:13px;text-align:center;padding:20px">Aucune donnée disponible.</p>'; }
function formatDate(d) {
  if(!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}); }
  catch { return d; }
}
function timeAgo(ts) {
  const diff=Date.now()-ts, m=60000, h=3600000, d=86400000;
  if(diff<m)  return "à l'instant";
  if(diff<h)  return Math.floor(diff/m)+'min';
  if(diff<d)  return Math.floor(diff/h)+'h';
  return Math.floor(diff/d)+'j';
}
function showErr2(el, msg) { el.textContent=msg; el.classList.remove('hidden'); }

/* Toast */
function toast(msg, type='success') {
  const el = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  el.className = `toast ${type}`;
  el.classList.remove('hidden');
  if(toastT) clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.add('hidden'), 3500);
}


/* ══ CONSTANTS & RENDER FUNCTIONS (from app.js) ════════════ */

const SPORT_COLORS = {
  'Football':'#22d3ee','Athlétisme':'#34d399','Basketball':'#fbbf24',
  'Natation':'#60a5fa','Boxe':'#f87171','Rugby':'#a78bfa',
  'Tennis':'#fb923c','Cyclisme':'#4ade80','Volleyball':'#e879f9',
  'Judo':'#f43f5e','Taekwondo':'#38bdf8','Autre':'#94a3b8',
  // EN compat
  'Athletics':'#34d399','Swimming':'#60a5fa','Boxing':'#f87171','Cycling':'#4ade80',
};

const FIELD_RULES = {
  'f-name':      { required: true,  min: 2,    max: 80,   label: 'Nom complet', length: true },
  'f-gender':    { required: true,  label: 'Genre' },
  'f-age':       { required: true,  min: 8,    max: 50,   label: 'Âge' },
  'f-sport':     { required: true,  label: 'Sport' },
  'f-email':     { required: false, pattern: /^[^@]+@[^@]+\.[^@]+$/, label: 'Email' },
  'f-height':    { required: false, min: 100,  max: 230,  label: 'Taille' },
  'f-weight':    { required: false, min: 30,   max: 200,  label: 'Poids' },
  'f-armspan':   { required: false, min: 100,  max: 250,  label: 'Envergure' },
  'f-leglength': { required: false, min: 50,   max: 130,  label: 'Long. jambe' },
  'f-chest':     { required: false, min: 60,   max: 160,  label: 'Tour poitrine' },
  'f-waist':     { required: false, min: 50,   max: 150,  label: 'Tour taille' },
  'f-sprint':    { required: false, min: 9.5,  max: 25,   label: 'Sprint 100m' },
  'f-jump':      { required: false, min: 10,   max: 120,  label: 'Saut vertical' },
  'f-vo2':       { required: false, min: 20,   max: 90,   label: 'VO₂ Max' },
  'f-speed':     { required: false, min: 10,   max: 50,   label: 'Vitesse max' },
  'f-strength':  { required: false, min: 1,    max: 100,  label: 'Force' },
  'f-endurance': { required: false, min: 1,    max: 100,  label: 'Endurance' },
  'f-hr':        { required: false, min: 30,   max: 110,  label: 'FC repos' },
  'f-bodyfat':   { required: false, min: 3,    max: 45,   label: 'Graisse corp.' },
  'f-muscle':    { required: false, min: 10,   max: 100,  label: 'Masse musc.' },
  'f-flexibility':{ required: false, min: 1,   max: 100,  label: 'Souplesse' },
};

const PROG_METRICS = [
  { key: 'weight',    label: 'Poids',      unit: 'kg',         color: '#22d3ee',  invert: false, max: 120, min: 40  },
  { key: 'sprint',    label: 'Sprint 100m',unit: 's',          color: '#f87171',  invert: true,  max: 20,  min: 9   },
  { key: 'speed',     label: 'Vitesse max',unit: 'km/h',       color: '#34d399',  invert: false, max: 45,  min: 15  },
  { key: 'vo2',       label: 'VO₂ Max',    unit: 'ml/kg/min',  color: '#a78bfa',  invert: false, max: 90,  min: 20  },
  { key: 'strength',  label: 'Force',      unit: '/100',       color: '#fbbf24',  invert: false, max: 100, min: 0   },
  { key: 'endurance', label: 'Endurance',  unit: '/100',       color: '#fb923c',  invert: false, max: 100, min: 0   },
];

const DEFAULT_ADMIN_PIN = '2003';
const DEFAULT_PDG_PIN   = '1205';

const PIN_MAX_ATTEMPTS = 3;

const PIN_BLOCK_MINUTES = 5;

const PIN_SESSION_MINUTES = 30;


function toggleSearch(){
  const bar=document.getElementById('quick-search-bar');
  const res=document.getElementById('quick-search-results');
  bar.classList.toggle('hidden');
  if(!bar.classList.contains('hidden')){
    document.getElementById('quick-search-input').value='';
    res.classList.add('hidden');
    document.getElementById('quick-search-input').focus();
  } else {
    res.classList.add('hidden');
  }
}

function quickSearch(){
  const q=document.getElementById('quick-search-input').value.toLowerCase().trim();
  const res=document.getElementById('quick-search-results');
  if(!q){res.classList.add('hidden');return;}
  const found=athletes.filter(a=>
    a.name.toLowerCase().includes(q)||
    (a.sport||'').toLowerCase().includes(q)||
    (a.country||'').toLowerCase().includes(q)
  ).slice(0,6);
  if(!found.length){res.innerHTML='<div class="qs-item"><span style="color:var(--text-3);font-size:13px">Aucun résultat</span></div>';res.classList.remove('hidden');return;}
  res.innerHTML=found.map(a=>`
    <div class="qs-item" onclick="toggleSearch();openAthleteModal('${a.id}')">
      ${a.photo?`<img class="qs-photo" src="${a.photo}" alt=""/>`:
        `<div class="qs-photo">${initials(a.name)}</div>`}
      <div class="qs-info">
        <div class="qs-name">${esc(a.name)}</div>
        <div class="qs-meta">${esc(a.country||'')} · ${esc(a.age||'?')} ans</div>
      </div>
      <span class="qs-badge">${esc(a.sport)}</span>
    </div>`).join('');
  res.classList.remove('hidden');
}

function renderDashboard(){
  const total=athletes.length;
  const ages=athletes.map(a=>+a.age).filter(Boolean);
  const heights=athletes.map(a=>+a.height).filter(Boolean);
  const weights=athletes.map(a=>+a.weight).filter(Boolean);
  const now=Date.now(); const week=7*86400000;
  const newThisWeek=athletes.filter(a=>(now-(a.createdAt||0))<week).length;
  const sports=new Set(athletes.map(a=>a.sport)).size;
  const countries=new Set(athletes.map(a=>a.country).filter(Boolean)).size;

  setText('stat-total', total);
  setText('stat-avg-age',    ages.length    ? avg(ages).toFixed(1)    : '—');
  setText('stat-avg-height', heights.length ? avg(heights).toFixed(1) : '—');
  setText('stat-avg-weight', weights.length ? avg(weights).toFixed(1) : '—');
  setText('stat-new-this-week', `+${newThisWeek} cette semaine`);
  setText('stat-sports-count',  `${sports} sport${sports>1?'s':''}`);
  setText('stat-countries-count',`${countries} pay${countries>1?'s':''}`);
  document.getElementById('athletes-count-badge').textContent=total;

  renderRecentAthletes();
  renderSportDistribution();
  renderTopPerformers();
}

function renderRecentAthletes(){
  const c=document.getElementById('recent-athletes-list');
  const rec=[...athletes].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)).slice(0,5);
  if(!rec.length){c.innerHTML='<p class="empty-msg">Aucun athlète. <a href="#" onclick="navigate(\'add-athlete\')">Ajouter.</a></p>';return;}
  c.innerHTML=rec.map(a=>`
    <div class="recent-item" onclick="openAthleteModal('${a.id}')">
      ${a.photo?`<img class="recent-item-photo" src="${a.photo}" alt=""/>`:
        `<div class="recent-item-photo">${initials(a.name)}</div>`}
      <div style="flex:1;min-width:0">
        <div class="recent-item-name">${esc(a.name)}</div>
        <div class="recent-item-sport">${esc(a.country||'Afrique')} · ${esc(a.sport)}</div>
      </div>
      <span class="recent-item-badge">${esc(a.sport)}</span>
    </div>`).join('');
}

function renderSportDistribution(){
  const c=document.getElementById('sport-distribution');
  const dist=sportCounts();
  const sorted=Object.entries(dist).sort((a,b)=>b[1]-a[1]);
  const mx=Math.max(...Object.values(dist),1);
  if(!sorted.length){c.innerHTML='<p class="empty-msg">Aucune donnée.</p>';return;}
  c.innerHTML=sorted.map(([s,n])=>`
    <div class="sport-row">
      <span class="sport-name">${esc(s)}</span>
      <div class="sport-bar-wrap"><div class="sport-bar" style="width:${(n/mx)*100}%;background:${SPORT_COLORS[s]||'var(--accent)'}"></div></div>
      <span class="sport-count">${n}</span>
    </div>`).join('');
}

function renderTopPerformers(){
  const c=document.getElementById('top-performers');
  const bySpeed=[...athletes].filter(a=>a.speed).sort((a,b)=>+b.speed-+a.speed).slice(0,6);
  if(!bySpeed.length){c.innerHTML='<p class="empty-msg">Ajoutez des données de vitesse.</p>';return;}
  const ranks=['🥇','🥈','🥉','4','5','6'];
  const cls=['gold','silver','bronze','','',''];
  c.innerHTML=bySpeed.map((a,i)=>`
    <div class="top-card" onclick="openAthleteModal('${a.id}')">
      <div class="top-rank ${cls[i]}">${ranks[i]}</div>
      <div class="top-info">
        <div class="top-name">${esc(a.name)}</div>
        <div class="top-meta">${esc(a.sport)}</div>
      </div>
      <div class="top-val">${a.speed} km/h</div>
    </div>`).join('');
}

function renderAthletes(filtered){
  const list=filtered!==undefined?filtered:athletes;
  const grid=document.getElementById('athletes-grid');
  updateFilters();
  document.getElementById('filter-count').textContent=`${list.length} athlète${list.length!==1?'s':''}`;
  if(!list.length){
    grid.innerHTML=`<div class="empty-state">
      <svg viewBox="0 0 80 80" fill="none" width="64" height="64"><circle cx="40" cy="28" r="14" stroke="#475569" stroke-width="2"/><path d="M12 70c0-15.464 12.536-28 28-28s28 12.536 28 28" stroke="#475569" stroke-width="2" stroke-linecap="round"/></svg>
      <p>Aucun athlète trouvé.<br><a href="#" onclick="navigate('add-athlete')">Ajouter le premier →</a></p>
    </div>`;
    return;
  }
  grid.innerHTML=list.map(a=>`
    <div class="athlete-card" data-id="${a.id}">
      <div class="card-photo-wrap">
        ${a.photo?`<img src="${a.photo}" alt="${esc(a.name)}" loading="lazy"/>`:
          `<div class="card-photo-initials">${initials(a.name)}</div>`}
        <span class="card-sport-tag">${esc(a.sport)}</span>
        ${a.level?`<span class="card-level-tag">${esc(a.level)}</span>`:''}
      </div>
      <div class="card-body">
        <div class="card-name">${esc(a.name)}</div>
        <div class="card-meta">${esc(a.country||'Afrique')} · ${esc(a.age||'?')} ans</div>
        <div class="card-stats">
          <div class="card-stat"><div class="card-stat-val">${a.height||'—'}</div><div class="card-stat-label">Taille</div></div>
          <div class="card-stat"><div class="card-stat-val">${a.weight||'—'}</div><div class="card-stat-label">Poids</div></div>
          <div class="card-stat"><div class="card-stat-val">${a.sprint||'—'}</div><div class="card-stat-label">100m (s)</div></div>
        </div>
        <div class="card-actions">
          <button class="card-btn view"   onclick="openAthleteModal('${a.id}')">Voir</button>
          <button class="card-btn edit"   onclick="editAthlete('${a.id}')">Éditer</button>
          <button class="card-btn delete" onclick="confirmDelete('${a.id}',event)">Suppr.</button>
        </div>
      </div>
    </div>`).join('');
}

function filterAthletes(){
  const q=document.getElementById('search-input').value.toLowerCase();
  const sport=document.getElementById('sport-filter').value;
  const country=document.getElementById('country-filter').value;
  const sort=document.getElementById('sort-filter').value;
  let list=athletes.filter(a=>{
    const mt=a.name.toLowerCase().includes(q)||(a.country||'').toLowerCase().includes(q)||a.sport.toLowerCase().includes(q);
    const ms=!sport||a.sport===sport;
    const mc=!country||a.country===country;
    return mt&&ms&&mc;
  });
  if(sort==='name') list.sort((a,b)=>a.name.localeCompare(b.name));
  else if(sort==='age') list.sort((a,b)=>+a.age-+b.age);
  else if(sort==='speed') list.sort((a,b)=>+b.speed-+a.speed);
  else list.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  renderAthletes(list);
}

function updateFilters(){
  const sf=document.getElementById('sport-filter');
  const cf=document.getElementById('country-filter');
  const sports=[...new Set(athletes.map(a=>a.sport))].sort();
  const countries=[...new Set(athletes.map(a=>a.country).filter(Boolean))].sort();
  if(sf){
    const ss=sf.value;
    sf.innerHTML=`<option value="">Tous les sports</option>`+sports.map(s=>`<option value="${esc(s)}" ${s===ss?'selected':''}>${esc(s)}</option>`).join('');
  }
  if(cf){
    const sc=cf.value;
    cf.innerHTML=`<option value="">Tous les pays</option>`+countries.map(c=>`<option value="${esc(c)}" ${c===sc?'selected':''}>${esc(c)}</option>`).join('');
  }
  ['compare-a','compare-b','history-athlete-select','pdf-athlete-select','progression-athlete-select'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    const cur=el.value;
    el.innerHTML=`<option value="">Choisir…</option>`+athletes.map(a=>`<option value="${a.id}" ${a.id===cur?'selected':''}>${esc(a.name)} (${esc(a.sport)})</option>`).join('');
  });
}

function openAthleteModal(id){
  const a=athletes.find(x=>x.id===id); if(!a) return;
  openAthleteId=id;
  // Hero
  const photo=document.getElementById('modal-photo');
  const init=document.getElementById('modal-avatar-initials');
  if(a.photo){ photo.src=a.photo; photo.style.display='block'; init.style.display='none'; }
  else { photo.style.display='none'; init.style.display='flex'; init.textContent=initials(a.name); }
  setText('modal-sport',a.sport||'—');
  setText('modal-name',a.name||'—');
  setText('modal-age-country',[a.age?`${a.age} ans`:'',a.city,a.country].filter(Boolean).join(' · '));
  const lb=document.getElementById('modal-level-badge');
  if(a.level){lb.textContent=a.level;lb.style.display='inline-block';}else{lb.style.display='none';}
  // Overview
  const bmi=a.height&&a.weight?(+a.weight/((+a.height/100)**2)).toFixed(1):'—';
  setText('md-height',a.height?`${a.height} cm`:'—');
  setText('md-weight',a.weight?`${a.weight} kg`:'—');
  setText('md-bmi',bmi!=='—'?`${bmi}`:'—');
  setText('md-armspan',a.armspan?`${a.armspan} cm`:'—');
  setText('md-leglength',a.leglength?`${a.leglength} cm`:'—');
  setText('md-country',a.country||'—');
  setText('md-email',a.email||'—');
  setText('md-notes',a.notes||'—');
  // Physiology
  setText('md-hr',a.hr?`${a.hr} bpm`:'—');
  setText('md-bodyfat',a.bodyfat?`${a.bodyfat}%`:'—');
  setText('md-muscle',a.muscle?`${a.muscle} kg`:'—');
  setText('md-flexibility',a.flexibility?`${a.flexibility}/100`:'—');
  setText('md-vo2',a.vo2?`${a.vo2} ml/kg/min`:'—');
  setText('md-speed',a.speed?`${a.speed} km/h`:'—');
  // Performance bars
  const pb=document.getElementById('modal-perf-bars');
  const perfs=[
    {l:'Sprint 100m',v:a.sprint,u:'s',max:15,inv:true},
    {l:'Saut vertical',v:a.jump,u:'cm',max:100},
    {l:'Vitesse max',v:a.speed,u:'km/h',max:45},
    {l:'VO₂ Max',v:a.vo2,u:'ml/kg/min',max:80},
    {l:'Force',v:a.strength,u:'/100',max:100},
    {l:'Endurance',v:a.endurance,u:'/100',max:100},
    {l:'Souplesse',v:a.flexibility,u:'/100',max:100},
  ];
  pb.innerHTML=perfs.filter(p=>p.v).map(p=>{
    let pct=(+p.v/p.max)*100;
    if(p.inv) pct=100-pct;
    pct=Math.min(Math.max(pct,3),100);
    return `<div class="perf-row">
      <div class="perf-label"><span>${p.l}</span><span>${p.v}${p.u}</span></div>
      <div class="perf-track"><div class="perf-fill" style="width:${pct}%"></div></div>
    </div>`;
  }).join('')||'<p style="color:var(--text-3);font-size:13px">Aucune donnée de performance.</p>';
  // History tab
  renderModalHistory(id);
  // Media
  const mc=document.getElementById('modal-media-content');
  let mh='';
  if(a.photo) mh+=`<img src="${a.photo}" alt="${esc(a.name)}" style="border-radius:8px;object-fit:cover;aspect-ratio:16/9;width:100%"/>`;
  (a.videos||[]).forEach(vi=>{mh+=`<video src="${vi.data}" controls style="border-radius:8px;background:#000;width:100%"></video>`;});
  if(!mh) mh='<p style="color:var(--text-3);font-size:13px">Aucun média uploadé.</p>';
  mc.innerHTML=mh;
  // Reset to first tab
  switchModalTab('overview',document.querySelector('.modal-tab'));
  document.getElementById('athlete-modal').classList.remove('hidden');
  document.body.style.overflow='hidden';
}

function renderModalHistory(id){
  const c=document.getElementById('modal-history-content');
  const h=(historyData[id]||[]).sort((a,b)=>new Date(b.date)-new Date(a.date));
  if(!h.length){
    c.innerHTML=`<div style="text-align:center;padding:32px;color:var(--text-3);font-size:13px">
      Aucun historique. <br>
      <button class="btn-primary sm" style="margin-top:12px" onclick="closeAthleteModal();historyAthleteId='${id}';navigate('history');setTimeout(()=>{document.getElementById('history-athlete-select').value='${id}';renderHistory();},100)">Voir l'historique →</button>
    </div>`;
    return;
  }
  c.innerHTML=h.slice(0,5).map(e=>{
    const stats=[];
    if(e.weight)   stats.push(`Poids: <span>${e.weight} kg</span>`);
    if(e.sprint)   stats.push(`100m: <span>${e.sprint}s</span>`);
    if(e.speed)    stats.push(`Vitesse: <span>${e.speed} km/h</span>`);
    if(e.vo2)      stats.push(`VO₂: <span>${e.vo2}</span>`);
    return `<div class="history-entry">
      <div class="history-dot"><svg viewBox="0 0 16 16" fill="none" width="14" height="14"><circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.5"/></svg></div>
      <div class="history-body">
        <div class="history-date">${formatDate(e.date)}</div>
        ${e.note?`<div class="history-note">${esc(e.note)}</div>`:''}
        <div class="history-stats">${stats.map(s=>`<div class="history-stat">${s}</div>`).join('')}</div>
      </div>
    </div>`;
  }).join('');
}

function closeAthleteModal(){
  document.getElementById('athlete-modal').classList.add('hidden');
  document.body.style.overflow='';
  openAthleteId=null;
}

function closeModalOnOverlay(e){if(e.target===document.getElementById('athlete-modal'))closeAthleteModal();}

function switchModalTab(tab,btn){
  document.querySelectorAll('.modal-tab-content').forEach(t=>t.classList.remove('active'));
  document.getElementById('modal-tab-'+tab).classList.add('active');
  document.querySelectorAll('.modal-tab').forEach(t=>t.classList.remove('active'));
  if(btn) btn.classList.add('active');
}

function exportAthleteFromModal(){if(!openAthleteId)return;generateAthletePDF(athletes.find(a=>a.id===openAthleteId));}

function editAthleteFromModal(){const id=openAthleteId;closeAthleteModal();if(id)editAthlete(id);}

function deleteAthleteFromModal(){
  if (!openAthleteId) return;
  const id = openAthleteId;
  closeAthleteModal();
  openPinModal(() => {
    if (!confirm('Supprimer cet athlète ?')) return;
    deleteAthlete(id);
  }, 'pdg');
}

function renderAnalytics(){
  renderSportChart(); renderAgeChart(); renderHWScatter();
  renderSpeedChart(); renderScoreChart(); renderVo2Chart();
  renderSprintChart(); renderCountriesChart(); renderLevelsChart();
}

function renderSportChart(){
  const c=document.getElementById('chart-sports');
  const dist=sportCounts(); const mx=Math.max(...Object.values(dist),1);
  const sorted=Object.entries(dist).sort((a,b)=>b[1]-a[1]);
  if(!sorted.length){c.innerHTML=noData();return;}
  c.innerHTML=sorted.map(([s,n])=>`
    <div class="bar-row">
      <span class="bar-label">${esc(s)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(n/mx)*100}%;background:${SPORT_COLORS[s]||'var(--accent)'}"></div></div>
      <span class="bar-val">${n}</span>
    </div>`).join('');
}

function renderAgeChart(){
  const c=document.getElementById('chart-age');
  const ages=athletes.map(a=>+a.age).filter(Boolean);
  if(!ages.length){c.innerHTML=noData();return;}
  const b={'< 15':0,'15–17':0,'18–20':0,'21–24':0,'25+':0};
  ages.forEach(a=>{if(a<15)b['< 15']++;else if(a<=17)b['15–17']++;else if(a<=20)b['18–20']++;else if(a<=24)b['21–24']++;else b['25+']++;});
  const mx=Math.max(...Object.values(b),1);
  c.innerHTML=Object.entries(b).map(([k,n])=>`
    <div class="bar-row">
      <span class="bar-label">${k}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(n/mx)*100}%;background:var(--accent-3)"></div></div>
      <span class="bar-val">${n}</span>
    </div>`).join('');
}

function renderHWScatter(){
  const c=document.getElementById('chart-hw');
  const d=athletes.filter(a=>a.height&&a.weight);
  if(!d.length){c.innerHTML=noData();return;}
  const hs=d.map(a=>+a.height),ws=d.map(a=>+a.weight);
  const mnh=Math.min(...hs),mxh=Math.max(...hs),mnw=Math.min(...ws),mxw=Math.max(...ws);
  // keep axis labels
  c.innerHTML=`<div class="scatter-axis-x">Taille →</div><div class="scatter-axis-y">↑ Poids</div>`+
  d.map(a=>`<div class="scatter-point" title="${esc(a.name)}: ${a.height}cm / ${a.weight}kg" style="left:${pct(+a.height,mnh,mxh)}%;top:${100-pct(+a.weight,mnw,mxw)}%;background:${SPORT_COLORS[a.sport]||'var(--accent)'}"></div>`).join('');
}

function renderSpeedChart(){
  const c=document.getElementById('chart-speed');
  const d=[...athletes].filter(a=>a.speed).sort((a,b)=>+b.speed-+a.speed).slice(0,8);
  if(!d.length){c.innerHTML=noData();return;}
  const mx=+d[0].speed;
  c.innerHTML=d.map(a=>`
    <div class="bar-row">
      <span class="bar-label">${esc(a.name.split(' ')[0])}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(+a.speed/mx)*100}%;background:var(--success)"></div></div>
      <span class="bar-val">${a.speed}</span>
    </div>`).join('');
}

function renderSprintChart(){
  const c=document.getElementById('chart-sprint');
  const d=[...athletes].filter(a=>a.sprint).sort((a,b)=>+a.sprint-+b.sprint).slice(0,8);
  if(!d.length){c.innerHTML=noData();return;}
  const mn=+d[0].sprint, mx=+d[d.length-1].sprint;
  c.innerHTML=d.map(a=>`
    <div class="bar-row">
      <span class="bar-label">${esc(a.name.split(' ')[0])}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(1-(+a.sprint-mn)/(mx-mn||1))*100}%;background:var(--accent)"></div></div>
      <span class="bar-val">${a.sprint}s</span>
    </div>`).join('');
}

function renderScoreChart(){
  const c=document.getElementById('chart-scores');
  const fields=[
    {l:'Force',k:'strength',col:'var(--accent)'},
    {l:'Endurance',k:'endurance',col:'var(--accent-3)'},
    {l:'Souplesse',k:'flexibility',col:'var(--success)'},
    {l:'Saut',k:'jump',col:'var(--warn)'},
  ];
  c.innerHTML=fields.map(f=>{
    const vals=athletes.map(a=>+a[f.k]).filter(Boolean);
    const a=vals.length?Math.round(avg(vals)):0;
    return `<div class="score-row">
      <span class="score-label">${f.l}</span>
      <div class="score-bar"><div class="score-fill" style="width:${a}%;background:${f.col}"></div></div>
      <span class="score-val">${a||'—'}</span>
    </div>`;
  }).join('');
}

function renderVo2Chart(){
  const c=document.getElementById('chart-vo2');
  const d=[...athletes].filter(a=>a.vo2).sort((a,b)=>+b.vo2-+a.vo2).slice(0,6);
  if(!d.length){c.innerHTML=noData();return;}
  const mx=+d[0].vo2;
  c.innerHTML=d.map(a=>`
    <div class="bar-row">
      <span class="bar-label">${esc(a.name.split(' ')[0])}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(+a.vo2/mx)*100}%;background:var(--warn)"></div></div>
      <span class="bar-val">${a.vo2}</span>
    </div>`).join('');
}

function renderCountriesChart(){
  const c=document.getElementById('chart-countries');
  const dist={};
  athletes.forEach(a=>{if(a.country)dist[a.country]=(dist[a.country]||0)+1;});
  const sorted=Object.entries(dist).sort((a,b)=>b[1]-a[1]).slice(0,8);
  if(!sorted.length){c.innerHTML=noData();return;}
  const mx=sorted[0][1];
  c.innerHTML=sorted.map(([co,n])=>`
    <div class="bar-row">
      <span class="bar-label">${esc(co)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(n/mx)*100}%;background:var(--orange)"></div></div>
      <span class="bar-val">${n}</span>
    </div>`).join('');
}

function renderLevelsChart(){
  const c=document.getElementById('chart-levels');
  const dist={};
  athletes.forEach(a=>{if(a.level)dist[a.level]=(dist[a.level]||0)+1;});
  const sorted=Object.entries(dist).sort((a,b)=>b[1]-a[1]);
  if(!sorted.length){c.innerHTML=noData();return;}
  const mx=sorted[0][1];
  const cols=['var(--success)','var(--accent)','var(--warn)','var(--orange)','var(--danger)'];
  c.innerHTML=sorted.map(([l,n],i)=>`
    <div class="bar-row">
      <span class="bar-label">${esc(l)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(n/mx)*100}%;background:${cols[i]||'var(--accent)'}"></div></div>
      <span class="bar-val">${n}</span>
    </div>`).join('');
}

function renderComparePage(){
  updateFilters();
  renderCompare();
}

function renderCompare(){
  const idA=document.getElementById('compare-a').value;
  const idB=document.getElementById('compare-b').value;
  const c=document.getElementById('compare-result');
  if(!idA||!idB||idA===idB){
    c.innerHTML=`<div class="compare-empty">
      <svg viewBox="0 0 64 64" fill="none" width="48" height="48"><rect x="4" y="12" width="24" height="40" rx="3" stroke="#475569" stroke-width="1.5"/><rect x="36" y="12" width="24" height="40" rx="3" stroke="#475569" stroke-width="1.5"/><path d="M28 32h8" stroke="#22d3ee" stroke-width="2" stroke-linecap="round"/></svg>
      <p>${idA===idB&&idA?'Choisissez deux athlètes différents.':'Sélectionnez deux athlètes pour lancer la comparaison'}</p>
    </div>`;
    return;
  }
  const a=athletes.find(x=>x.id===idA), b=athletes.find(x=>x.id===idB);
  if(!a||!b) return;
  const rows=[
    {l:'Âge',ka:'age',kb:'age',u:'ans',lower:false},
    {l:'Taille',ka:'height',kb:'height',u:'cm',lower:false},
    {l:'Poids',ka:'weight',kb:'weight',u:'kg',lower:false},
    {l:'Sprint 100m',ka:'sprint',kb:'sprint',u:'s',lower:true},
    {l:'Saut (cm)',ka:'jump',kb:'jump',u:'cm',lower:false},
    {l:'VO₂ Max',ka:'vo2',kb:'vo2',u:'',lower:false},
    {l:'Vitesse max',ka:'speed',kb:'speed',u:'km/h',lower:false},
    {l:'Force',ka:'strength',kb:'strength',u:'/100',lower:false},
    {l:'Endurance',ka:'endurance',kb:'endurance',u:'/100',lower:false},
    {l:'Souplesse',ka:'flexibility',kb:'flexibility',u:'/100',lower:false},
  ];
  function photoHtml(at){
    return at.photo?`<img class="compare-athlete-photo" src="${at.photo}" alt=""/>`:
      `<div class="compare-athlete-photo">${initials(at.name)}</div>`;
  }
  function valCell(valA,valB,lower,u){
    if(!valA&&!valB) return ['<span class="compare-stat-val">—</span>','<span class="compare-stat-val">—</span>'];
    if(!valA) return ['<span class="compare-stat-val">—</span>',`<span class="compare-stat-val better">${valB}${u}</span>`];
    if(!valB) return [`<span class="compare-stat-val better">${valA}${u}</span>`,'<span class="compare-stat-val">—</span>'];
    const av=+valA, bv=+valB;
    const aBetter=lower?av<bv:av>bv, bBetter=lower?bv<av:bv>av;
    return [
      `<span class="compare-stat-val ${aBetter?'better':bBetter?'worse':''}">${valA}${u}</span>`,
      `<span class="compare-stat-val ${bBetter?'better':aBetter?'worse':''}">${valB}${u}</span>`,
    ];
  }
  const rowsHtml=rows.map(r=>{
    const [ca,cb]=valCell(a[r.ka],b[r.kb],r.lower,r.u);
    return {labelA:`<div class="compare-stat-row" style="justify-content:flex-start">${ca}</div>`,
      labelB:`<div class="compare-stat-row" style="justify-content:flex-end">${cb}</div>`,
      center:`<div class="compare-stat-label-center">${r.l}</div>`,
    };
  });
  c.innerHTML=`
    <div class="compare-grid">
      <div class="compare-col a">
        <div class="compare-col-header">
          ${photoHtml(a)}
          <div class="compare-athlete-name">${esc(a.name)}</div>
          <div class="compare-athlete-sport">${esc(a.sport)} · ${esc(a.country||'—')}</div>
        </div>
        ${rowsHtml.map(r=>r.labelA).join('')}
      </div>
      <div class="compare-labels-col">
        <div style="height:130px"></div>
        ${rowsHtml.map(r=>r.center).join('')}
      </div>
      <div class="compare-col b">
        <div class="compare-col-header">
          ${photoHtml(b)}
          <div class="compare-athlete-name">${esc(b.name)}</div>
          <div class="compare-athlete-sport">${esc(b.sport)} · ${esc(b.country||'—')}</div>
        </div>
        ${rowsHtml.map(r=>r.labelB).join('')}
      </div>
    </div>`;
}

function renderHistoryPage(){
  updateFilters();
  const sel=document.getElementById('history-athlete-select');
  if(historyAthleteId){ sel.value=historyAthleteId; historyAthleteId=null; }
  renderHistory();
  // Refresh progression page if open
  if (currentPage === 'progression') renderProgression();
}

function renderHistory(){
  const id=document.getElementById('history-athlete-select').value;
  const btn=document.getElementById('history-add-btn');
  const c=document.getElementById('history-content');
  if(!id){
    btn.style.display='none';
    c.innerHTML=`<div class="compare-empty" style="padding:64px 0">
      <svg viewBox="0 0 64 64" fill="none" width="48" height="48"><circle cx="32" cy="32" r="28" stroke="#475569" stroke-width="1.5"/><path d="M32 18v14l8 8" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <p>Sélectionnez un athlète pour voir son évolution</p>
    </div>`;
    return;
  }
  btn.style.display='inline-flex';
  const h=(historyData[id]||[]).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const a=athletes.find(x=>x.id===id);
  let html=`<div style="margin-bottom:20px"><strong style="font-family:var(--font-head);font-size:18px">${esc(a?a.name:'Athlète')}</strong> <span style="color:var(--text-3);font-size:13px">${h.length} entrée${h.length!==1?'s':''}</span></div>`;
  if(!h.length){
    html+=`<div class="compare-empty"><p>Aucune mesure enregistrée.<br>Cliquez sur "Ajouter mesure" pour commencer le suivi.</p></div>`;
  } else {
    // Sparklines for numeric fields
    const sparkFields=[
      {k:'weight',l:'Poids (kg)',col:'var(--accent)'},
      {k:'sprint',l:'Sprint 100m (s)',col:'var(--warn)'},
      {k:'speed', l:'Vitesse max (km/h)',col:'var(--success)'},
      {k:'vo2',   l:'VO₂ Max',col:'var(--accent-3)'},
    ];
    html+=`<div class="analytics-grid" style="margin-bottom:24px">`;
    sparkFields.forEach(f=>{
      const vals=h.filter(e=>e[f.k]).map(e=>({val:+e[f.k],date:e.date}));
      if(vals.length<2) return;
      const mn=Math.min(...vals.map(v=>v.val)), mx=Math.max(...vals.map(v=>v.val));
      const last=vals[vals.length-1].val, first=vals[0].val;
      const trend=last>first?'↑':last<first?'↓':'→';
      const trendCol=last>first?(f.k==='sprint'?'var(--danger)':'var(--success)'):(f.k==='sprint'?'var(--success)':'var(--danger)');
      html+=`<div class="history-chart">
        <h4>${f.l} <span style="color:${trendCol};margin-left:6px">${trend} ${last}</span></h4>
        <div class="sparkline">
          ${vals.map(v=>{
            const h2=mx===mn?80:((v.val-mn)/(mx-mn))*80;
            return `<div class="spark-bar" style="height:${Math.max(h2,4)}px;background:${f.col};opacity:0.8">
              <span class="spark-val">${v.val} (${v.date})</span>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    });
    html+=`</div>`;
    // Timeline
    html+=`<div class="history-timeline">`;
    [...h].reverse().forEach(e=>{
      const stats=[];
      if(e.weight)   stats.push(`Poids: <span>${e.weight} kg</span>`);
      if(e.sprint)   stats.push(`100m: <span>${e.sprint}s</span>`);
      if(e.speed)    stats.push(`Vitesse: <span>${e.speed} km/h</span>`);
      if(e.vo2)      stats.push(`VO₂: <span>${e.vo2}</span>`);
      if(e.strength) stats.push(`Force: <span>${e.strength}/100</span>`);
      if(e.endurance)stats.push(`Endurance: <span>${e.endurance}/100</span>`);
      html+=`<div class="history-entry">
        <div class="history-dot"><svg viewBox="0 0 16 16" fill="none" width="12" height="12"><circle cx="8" cy="8" r="5" stroke="currentColor" stroke-width="1.5"/></svg></div>
        <div class="history-body">
          <div class="history-date">${formatDate(e.date)}</div>
          ${e.note?`<div class="history-note">${esc(e.note)}</div>`:''}
          <div class="history-stats">${stats.map(s=>`<div class="history-stat">${s}</div>`).join('')}</div>
        </div>
      </div>`;
    });
    html+=`</div>`;
  }
  c.innerHTML=html;
}

function openHistoryModal(){
  const id=document.getElementById('history-athlete-select').value;
  if(!id){toast('Sélectionnez d\'abord un athlète.','error');return;}
  document.getElementById('h-date').value=new Date().toISOString().split('T')[0];
  ['h-weight','h-sprint','h-vo2','h-speed','h-strength','h-endurance','h-note'].forEach(f=>{document.getElementById(f).value='';});
  document.getElementById('history-modal').classList.remove('hidden');
  document.body.style.overflow='hidden';
}

function closeHistoryModal(){
  document.getElementById('history-modal').classList.add('hidden');
  document.body.style.overflow='';
}

function renderMedia(){
  renderMediaPhotos(); renderMediaVideos();
}

function renderMediaPhotos(){
  const c=document.getElementById('media-photos');
  const wph=athletes.filter(a=>a.photo);
  if(!wph.length){c.innerHTML='<div class="media-empty">Aucune photo. Ajoutez des photos lors de l\'enregistrement des athlètes.</div>';return;}
  c.innerHTML=wph.map(a=>`
    <div class="photo-thumb" onclick="openAthleteModal('${a.id}')">
      <img src="${a.photo}" alt="${esc(a.name)}" loading="lazy"/>
      <div class="photo-thumb-label">${esc(a.name)}</div>
    </div>`).join('');
}

function renderMediaVideos(){
  const c=document.getElementById('media-videos');
  const wv=athletes.filter(a=>a.videos&&a.videos.length);
  if(!wv.length){c.innerHTML='<div class="media-empty">Aucune vidéo. Uploadez des vidéos lors de l\'ajout d\'athlètes.</div>';return;}
  let h='';
  wv.forEach(a=>a.videos.forEach(vi=>{
    h+=`<div class="video-item">
      <video src="${vi.data}" controls preload="metadata"></video>
      <div class="video-item-info">
        <div class="video-item-name">${esc(a.name)}</div>
        <div class="video-item-meta">${esc(a.sport)} · ${esc(vi.name)}</div>
      </div>
    </div>`;
  }));
  c.innerHTML=h;
}

function switchMediaTab(tab,btn){
  document.getElementById('media-photos').classList.toggle('hidden',tab!=='photos');
  document.getElementById('media-videos').classList.toggle('hidden',tab!=='videos');
  document.querySelectorAll('.media-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
}

function renderProgressionPage() {
  updateFilters();
  const sel = document.getElementById('progression-athlete-select');
  if (progressionAthleteId) {
    sel.value = progressionAthleteId;
    progressionAthleteId = null;
  }
  renderProgression();
}

function renderProgression() {
  const id  = document.getElementById('progression-athlete-select')?.value;
  const btn = document.getElementById('progression-add-btn');
  const emptyEl  = document.getElementById('progression-empty');
  const heroEl   = document.getElementById('progression-hero');
  const graphsEl = document.getElementById('progression-graphs');
  const tableWrap= document.getElementById('progression-table-wrap');
  const yearBar  = document.getElementById('year-filter-bar');

  if (!id) {
    if(btn) btn.style.display='none';
    emptyEl.style.display='flex';
    heroEl.classList.add('hidden');
    graphsEl.innerHTML='';
    if(tableWrap) tableWrap.classList.add('hidden');
    if(yearBar) yearBar.classList.add('hidden');
    return;
  }

  if(btn) btn.style.display='inline-flex';
  emptyEl.style.display='none';

  const athlete = athletes.find(x => x.id === id);
  if (!athlete) return;

  const allEntries = (historyData[id] || [])
    .map(e => ({...e}))
    .sort((a,b) => new Date(a.date) - new Date(b.date));

  // — Hero —
  renderProgressionHero(athlete, allEntries, heroEl);

  // — Year filter pills —
  const years = [...new Set(allEntries.map(e => e.date.slice(0,4)))].sort();
  renderYearFilterBar(years, yearBar);

  // — Filter entries by selected year —
  const entries = progressionYearFilter === 'all'
    ? allEntries
    : allEntries.filter(e => e.date.startsWith(progressionYearFilter));

  if (!entries.length) {
    graphsEl.innerHTML = `<div class="graph-card" style="grid-column:1/-1">
      <div class="graph-no-data">
        <svg viewBox="0 0 48 48" fill="none" width="36" height="36"><path d="M8 36L20 20l8 10 6-8 6 8" stroke="#475569" stroke-width="1.5" stroke-linecap="round"/><rect x="4" y="8" width="40" height="32" rx="3" stroke="#475569" stroke-width="1.5"/></svg>
        <p>Aucune mesure pour ${progressionYearFilter === 'all' ? 'cet athlète' : 'ann\u00e9e ' + progressionYearFilter}.<br>
        Cliquez sur <strong>+ Ajouter mesure</strong> pour commencer.</p>
      </div>
    </div>`;
    if(tableWrap) tableWrap.classList.add('hidden');
    return;
  }

  // — Graphes SVG —
  graphsEl.innerHTML = '';
  graphsEl.className = 'progression-graphs-grid';

  PROG_METRICS.forEach(metric => {
    const data = entries
      .filter(e => e[metric.key] !== '' && e[metric.key] !== null && e[metric.key] !== undefined)
      .map(e => ({ date: e.date, val: parseFloat(e[metric.key]) }))
      .filter(e => !isNaN(e.val));

    const card = document.createElement('div');
    card.className = 'graph-card';
    card.innerHTML = buildLineGraphHTML(metric, data);
    graphsEl.appendChild(card);
  });

  // — Tableau récapitulatif —
  renderProgressionTable(entries, allEntries, id, tableWrap);
}

function renderProgressionHero(athlete, entries, el) {
  const last  = entries[entries.length - 1];
  const first = entries[0];
  const count = entries.length;

  // Calcul progression sprint (si disponible)
  const sprintEntries = entries.filter(e => e.sprint);
  let sprintDelta = null;
  if (sprintEntries.length >= 2) {
    sprintDelta = (parseFloat(sprintEntries[0].sprint) - parseFloat(sprintEntries[sprintEntries.length-1].sprint)).toFixed(2);
  }

  const speedEntries = entries.filter(e => e.speed);
  let speedDelta = null;
  if (speedEntries.length >= 2) {
    speedDelta = (parseFloat(speedEntries[speedEntries.length-1].speed) - parseFloat(speedEntries[0].speed)).toFixed(1);
  }

  el.classList.remove('hidden');
  el.innerHTML = `
    <div class="progression-hero">
      <div class="progression-hero-photo">
        ${athlete.photo
          ? `<img src="${athlete.photo}" alt="${esc(athlete.name)}"/>`
          : initials(athlete.name)}
      </div>
      <div class="progression-hero-info">
        <div class="progression-hero-name">${esc(athlete.name)}</div>
        <div class="progression-hero-meta">
          ${esc(athlete.sport)} · ${esc(athlete.country||'Afrique')} · ${athlete.age||'?'} ans
        </div>
        <div class="progression-hero-stats">
          <div class="prog-mini-stat">
            <span class="prog-mini-stat-val">${count}</span>
            <span class="prog-mini-stat-label">Mesures</span>
          </div>
          ${first ? `<div class="prog-mini-stat">
            <span class="prog-mini-stat-val" style="font-size:13px">${formatDate(first.date)}</span>
            <span class="prog-mini-stat-label">Première entrée</span>
          </div>` : ''}
          ${sprintDelta !== null ? `<div class="prog-mini-stat">
            <span class="prog-mini-stat-val" style="color:${+sprintDelta>0?'var(--success)':'var(--danger)'}">${+sprintDelta>0?'−':'+'}${Math.abs(sprintDelta)}s</span>
            <span class="prog-mini-stat-label">Gain Sprint</span>
          </div>` : ''}
          ${speedDelta !== null ? `<div class="prog-mini-stat">
            <span class="prog-mini-stat-val" style="color:${+speedDelta>0?'var(--success)':'var(--danger)'}">${+speedDelta>0?'+':''}${speedDelta} km/h</span>
            <span class="prog-mini-stat-label">Gain Vitesse</span>
          </div>` : ''}
        </div>
      </div>
    </div>`;
}

function renderYearFilterBar(years, barEl) {
  if (!barEl || !years.length) return;
  barEl.classList.remove('hidden');

  const pills = ['all', ...years];
  barEl.innerHTML = pills.map(y => `
    <button class="year-pill ${progressionYearFilter === y ? 'active' : ''}"
      onclick="setProgressionYearFilter('${y}')">
      ${y === 'all' ? 'Toutes les années' : y}
    </button>`).join('');
}

function setProgressionYearFilter(year) {
  progressionYearFilter = year;
  renderProgression();
}

function buildLineGraphHTML(metric, data) {
  if (!data.length) {
    return `
      <div class="graph-card-header">
        <span class="graph-card-title">${metric.label}</span>
        <span class="graph-card-trend flat">— aucune donnée</span>
      </div>
      <div class="graph-no-data" style="height:120px">
        <svg viewBox="0 0 32 32" fill="none" width="24" height="24"><path d="M4 24L12 14l6 8 4-6 6 6" stroke="#475569" stroke-width="1.5" stroke-linecap="round"/></svg>
        <small>Pas de données ${metric.label}</small>
      </div>`;
  }

  const first = data[0].val, last = data[data.length-1].val;
  const delta = (last - first);
  const deltaFormatted = (delta >= 0 ? '+' : '') + delta.toFixed(metric.key === 'sprint' ? 2 : 1);

  // Pour sprint : amélioration = valeur qui baisse
  const improved = metric.invert ? delta < 0 : delta > 0;
  const trendClass = delta === 0 ? 'flat' : (improved ? 'up' : 'down');
  const trendIcon  = delta === 0 ? '→' : (improved ? '↑' : '↓');

  // SVG dimensions
  const W = 400, H = 140, PAD = { top: 12, right: 12, bottom: 28, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const vals = data.map(d => d.val);
  const minVal = Math.min(...vals), maxVal = Math.max(...vals);
  const range  = maxVal - minVal || 1;
  const padded_min = minVal - range * 0.1;
  const padded_max = maxVal + range * 0.1;
  const padded_range = padded_max - padded_min || 1;

  function xPos(i) { return PAD.left + (i / Math.max(data.length-1, 1)) * chartW; }
  function yPos(v) { return PAD.top + chartH - ((v - padded_min) / padded_range) * chartH; }

  // Build SVG path
  const points = data.map((d, i) => `${xPos(i).toFixed(1)},${yPos(d.val).toFixed(1)}`);
  const linePath = 'M ' + points.join(' L ');

  // Area fill path (closed polygon)
  const areaPath = linePath +
    ` L ${xPos(data.length-1).toFixed(1)},${(PAD.top+chartH).toFixed(1)}` +
    ` L ${PAD.left.toFixed(1)},${(PAD.top+chartH).toFixed(1)} Z`;

  // Grid lines (3 horizontal)
  const gridLines = [0.25, 0.5, 0.75].map(p => {
    const y = PAD.top + chartH * (1-p);
    const val = (padded_min + padded_range * p).toFixed(1);
    return `
      <line x1="${PAD.left}" y1="${y.toFixed(1)}" x2="${W-PAD.right}" y2="${y.toFixed(1)}" class="chart-grid-line"/>
      <text x="${PAD.left - 4}" y="${(y+3).toFixed(1)}" class="chart-axis-label" text-anchor="end">${val}</text>`;
  }).join('');

  // X axis labels (dates — max 5 shown)
  const step = Math.max(1, Math.floor(data.length / 5));
  const xLabels = data
    .filter((_, i) => i === 0 || i === data.length-1 || i % step === 0)
    .map((d, _, arr) => {
      const idx = data.indexOf(d);
      return `<text x="${xPos(idx).toFixed(1)}" y="${(H-4).toFixed(1)}" class="chart-axis-label" text-anchor="middle">${d.date.slice(0,7)}</text>`;
    }).join('');

  // Dot + tooltip HTML (positioned absolutely)
  const dotsHTML = data.map((d, i) => {
    const x = xPos(i), y = yPos(d.val);
    // Convert SVG coords to % for absolute positioning
    const leftPct = (x / W * 100).toFixed(1);
    const topPct  = (y / H * 100).toFixed(1);
    return `<div class="chart-dot-wrapper" style="position:absolute;left:${leftPct}%;top:${topPct}%;transform:translate(-50%,-50%);z-index:3">
      <svg width="12" height="12" style="overflow:visible;cursor:pointer"
        onmouseenter="showChartTip(this,'${d.date}','${d.val} ${metric.unit}')"
        onmouseleave="hideChartTip(this)">
        <circle cx="6" cy="6" r="4" fill="${metric.color}" stroke="var(--bg)" stroke-width="2" class="chart-dot"/>
      </svg>
      <div class="chart-tooltip"><strong>${d.date}</strong>${d.val} ${metric.unit}</div>
    </div>`;
  }).join('');

  return `
    <div class="graph-card-header">
      <span class="graph-card-title">${metric.label}</span>
      <div class="graph-card-trend ${trendClass}">
        <span>${trendIcon}</span>
        <span>${deltaFormatted} ${metric.unit}</span>
        <span style="font-weight:400;color:var(--text-3);margin-left:4px">vs début</span>
      </div>
    </div>
    <div class="svg-chart-wrap" style="position:relative">
      <svg class="svg-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <!-- Grid -->
        ${gridLines}
        <!-- Area -->
        <path d="${areaPath}" fill="${metric.color}" class="chart-area"/>
        <!-- Line -->
        <path d="${linePath}" stroke="${metric.color}" class="chart-line"/>
        <!-- X labels -->
        ${xLabels}
        <!-- Y axis title -->
        <text x="10" y="${(PAD.top + chartH/2).toFixed(1)}" class="chart-axis-label"
          transform="rotate(-90,10,${(PAD.top + chartH/2).toFixed(1)})" text-anchor="middle">${metric.unit}</text>
      </svg>
      <!-- Interactive dots -->
      ${dotsHTML}
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px;color:var(--text-3)">
      <span>Min: <strong style="color:var(--text)">${Math.min(...vals).toFixed(1)} ${metric.unit}</strong></span>
      <span>Moy: <strong style="color:var(--accent)">${(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1)} ${metric.unit}</strong></span>
      <span>Max: <strong style="color:var(--text)">${Math.max(...vals).toFixed(1)} ${metric.unit}</strong></span>
    </div>`;
}

function showChartTip(svgEl, date, value) {
  const tip = svgEl.parentElement.querySelector('.chart-tooltip');
  if (tip) tip.classList.add('visible');
}

function hideChartTip(svgEl) {
  const tip = svgEl.parentElement.querySelector('.chart-tooltip');
  if (tip) tip.classList.remove('visible');
}

function renderProgressionTable(entries, allEntries, athleteId, tableWrap) {
  if (!tableWrap) return;
  tableWrap.classList.remove('hidden');

  const countEl = document.getElementById('prog-entry-count');
  if (countEl) countEl.textContent = `${entries.length} entrée${entries.length!==1?'s':''}`;

  const tbody = document.getElementById('progression-table-body');
  if (!tbody) return;

  // Helper: delta cell vs previous entry
  function deltaCell(curr, prev, key, unit, invert=false) {
    if (!curr[key] || !prev?.[key]) return `<td style="color:var(--text-3)">—</td>`;
    const d = parseFloat(curr[key]) - parseFloat(prev[key]);
    if (Math.abs(d) < 0.001) return `<td><span class="delta-badge neu">= ${curr[key]}${unit}</span></td>`;
    const improved = invert ? d < 0 : d > 0;
    const sign = d > 0 ? '+' : '';
    const cls  = improved ? 'pos' : 'neg';
    return `<td><span class="delta-badge ${cls}">${sign}${d.toFixed(key==='sprint'?2:1)} ${unit}</span></td>`;
  }

  const sorted = [...entries].sort((a,b) => new Date(b.date)-new Date(a.date));
  tbody.innerHTML = sorted.map((e, i) => {
    const prev = sorted[i+1]; // previous in time (next in reversed array)
    return `<tr>
      <td style="font-weight:600;white-space:nowrap">${formatDate(e.date)}</td>
      ${e.weight    ? deltaCell(e,prev,'weight','kg')    : '<td style="color:var(--text-3)">—</td>'}
      ${e.sprint    ? deltaCell(e,prev,'sprint','s',true): '<td style="color:var(--text-3)">—</td>'}
      ${e.speed     ? deltaCell(e,prev,'speed','km/h')   : '<td style="color:var(--text-3)">—</td>'}
      ${e.vo2       ? deltaCell(e,prev,'vo2','')         : '<td style="color:var(--text-3)">—</td>'}
      ${e.strength  ? deltaCell(e,prev,'strength','/100'): '<td style="color:var(--text-3)">—</td>'}
      ${e.endurance ? deltaCell(e,prev,'endurance','/100'): '<td style="color:var(--text-3)">—</td>'}
      <td style="color:var(--text-2);font-size:12px;max-width:160px">${esc(e.note||'—')}</td>
      <td>
        <button onclick="deleteHistoryEntry('${athleteId}','${e.date}')"
          style="background:none;border:none;color:var(--text-3);cursor:pointer;font-size:13px;padding:2px 6px"
          title="Supprimer cette entrée">✕</button>
      </td>
    </tr>`;
  }).join('');
}

function openHistoryModalFromProgression() {
  const sel = document.getElementById('progression-athlete-select');
  const id  = sel?.value;
  if (!id) return;
  // Sync the history-athlete-select
  const hSel = document.getElementById('history-athlete-select');
  if (hSel) hSel.value = id;
  document.getElementById('h-date').value = new Date().toISOString().split('T')[0];
  ['h-weight','h-sprint','h-vo2','h-speed','h-strength','h-endurance','h-note']
    .forEach(f => { const el=document.getElementById(f); if(el) el.value=''; });
  document.getElementById('history-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  // After save, refresh progression
  window._progressionRefreshNeeded = true;
}

function renderReportsPage(){ updateFilters(); }

function exportRosterPDF(){
  const rows=athletes.map(a=>`
    <tr>
      <td>${esc(a.name)}</td><td>${a.age||'—'}</td><td>${esc(a.sport)}</td>
      <td>${esc(a.country||'—')}</td><td>${a.height||'—'} cm</td><td>${a.weight||'—'} kg</td>
      <td>${a.sprint||'—'} s</td><td>${a.speed||'—'} km/h</td><td>${a.vo2||'—'}</td>
    </tr>`).join('');
  const dist=sportCounts();
  const distRows=Object.entries(dist).sort((a,b)=>b[1]-a[1]).map(([s,n])=>`<tr><td>${esc(s)}</td><td>${n}</td></tr>`).join('');
  const content=`
    <div style="font-family:Arial,sans-serif;color:#0f172a;max-width:900px;margin:0 auto;padding:40px">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #22d3ee">
        <div style="font-size:28px;font-weight:900;letter-spacing:-1px">SportData</div>
        <div style="color:#64748b;font-size:13px">Rapport d'effectif complet</div>
        <div style="margin-left:auto;font-size:12px;color:#94a3b8">${new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px">
        ${[['Total athlètes',athletes.length],['Âge moyen',avg(athletes.map(a=>+a.age).filter(Boolean)).toFixed(1)+' ans'],['Taille moy.',avg(athletes.map(a=>+a.height).filter(Boolean)).toFixed(1)+' cm'],['Sports',Object.keys(dist).length]].map(([l,v])=>`
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px">
            <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">${l}</div>
            <div style="font-size:22px;font-weight:700">${v}</div>
          </div>`).join('')}
      </div>
      <h2 style="font-size:15px;font-weight:700;margin-bottom:12px;color:#475569;text-transform:uppercase;letter-spacing:0.05em">Effectif complet</h2>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:28px">
        <thead><tr style="background:#0f172a;color:#fff">
          <th style="padding:10px 12px;text-align:left">Nom</th><th style="padding:10px 6px">Âge</th>
          <th style="padding:10px 6px">Sport</th><th style="padding:10px 6px">Pays</th>
          <th style="padding:10px 6px">Taille</th><th style="padding:10px 6px">Poids</th>
          <th style="padding:10px 6px">Sprint</th><th style="padding:10px 6px">Vitesse</th>
          <th style="padding:10px 6px">VO₂</th>
        </tr></thead>
        <tbody>${rows||'<tr><td colspan="9" style="text-align:center;padding:20px;color:#94a3b8">Aucun athlète</td></tr>'}</tbody>
      </table>
      <h2 style="font-size:15px;font-weight:700;margin-bottom:12px;color:#475569;text-transform:uppercase;letter-spacing:0.05em">Répartition par sport</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#f1f5f9"><th style="padding:8px 12px;text-align:left">Sport</th><th style="padding:8px 12px;text-align:right">Athlètes</th></tr></thead>
        <tbody>${distRows}</tbody>
      </table>
      <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">
        Généré par SportData Africa · ${new Date().toLocaleDateString('fr-FR')}
      </div>
    </div>`;
  showPDFPreview(content,'Rapport d\'effectif');
}

function exportAthletePDF(){
  const id=document.getElementById('pdf-athlete-select').value;
  if(!id){toast('Sélectionnez un athlète.','error');return;}
  const a=athletes.find(x=>x.id===id);
  if(a) generateAthletePDF(a);
}

function exportAnalyticsPDF(){
  const dist=sportCounts();
  const ages=athletes.map(a=>+a.age).filter(Boolean);
  const heights=athletes.map(a=>+a.height).filter(Boolean);
  const weights=athletes.map(a=>+a.weight).filter(Boolean);
  const speeds=athletes.map(a=>+a.speed).filter(Boolean);
  const vo2s=athletes.map(a=>+a.vo2).filter(Boolean);
  const content=`
    <div style="font-family:Arial,sans-serif;color:#0f172a;max-width:800px;margin:0 auto;padding:40px">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #22d3ee">
        <div style="font-size:22px;font-weight:900">SportData</div>
        <div style="color:#64748b;font-size:13px">Rapport analytique</div>
        <div style="margin-left:auto;font-size:12px;color:#94a3b8">${new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:28px">
        ${[
          ['Total athlètes',athletes.length,''],
          ['Âge moyen',ages.length?avg(ages).toFixed(1):'—',' ans'],
          ['Taille moy.',heights.length?avg(heights).toFixed(1):'—',' cm'],
          ['Poids moy.',weights.length?avg(weights).toFixed(1):'—',' kg'],
          ['Vitesse moy.',speeds.length?avg(speeds).toFixed(1):'—',' km/h'],
          ['VO₂ moy.',vo2s.length?avg(vo2s).toFixed(1):'—',' ml/kg/min'],
        ].map(([l,v,u])=>`<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px"><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">${l}</div><div style="font-size:20px;font-weight:700">${v}${u}</div></div>`).join('')}
      </div>
      <h2 style="font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:14px">Répartition par sport</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
        <thead><tr style="background:#f1f5f9"><th style="padding:8px 12px;text-align:left;font-size:12px">Sport</th><th style="text-align:right;padding:8px 12px;font-size:12px">Athlètes</th><th style="text-align:right;padding:8px 12px;font-size:12px">%</th></tr></thead>
        <tbody>${Object.entries(dist).sort((a,b)=>b[1]-a[1]).map(([s,n])=>`<tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px">${esc(s)}</td><td style="text-align:right;padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600">${n}</td><td style="text-align:right;padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b">${((n/athletes.length)*100).toFixed(1)}%</td></tr>`).join('')}</tbody>
      </table>
      <h2 style="font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:14px">Top 5 – Vitesse maximale</h2>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#f1f5f9"><th style="padding:8px 12px;text-align:left;font-size:12px">Athlète</th><th style="text-align:left;padding:8px 12px;font-size:12px">Sport</th><th style="text-align:right;padding:8px 12px;font-size:12px">Vitesse (km/h)</th></tr></thead>
        <tbody>${[...athletes].filter(a=>a.speed).sort((a,b)=>+b.speed-+a.speed).slice(0,5).map(a=>`<tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px">${esc(a.name)}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b">${esc(a.sport)}</td><td style="text-align:right;padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:600;color:#22d3ee">${a.speed}</td></tr>`).join('')}</tbody>
      </table>
      <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">Généré par SportData Africa · ${new Date().toLocaleDateString('fr-FR')}</div>
    </div>`;
  showPDFPreview(content,'Rapport analytique');
}

function generateAthletePDF(a){
  if(!a) return;
  const photoHtml=a.photo?`<img src="${a.photo}" style="width:100px;height:100px;border-radius:8px;object-fit:cover;border:2px solid #e2e8f0" alt=""/>`:
    `<div style="width:100px;height:100px;border-radius:8px;background:#0f172a;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:900;color:rgba(255,255,255,0.15)">${initials(a.name)}</div>`;
  const bmi=a.height&&a.weight?(+a.weight/((+a.height/100)**2)).toFixed(1):'—';
  const row=(l,v)=>`<tr><td style="padding:8px 12px;color:#64748b;font-size:12px;border-bottom:1px solid #f1f5f9">${l}</td><td style="padding:8px 12px;font-weight:600;font-size:13px;border-bottom:1px solid #f1f5f9">${v||'—'}</td></tr>`;
  const bar=(l,v,max,col='#22d3ee',inv=false)=>{
    if(!v) return '';
    let p=(+v/max)*100; if(inv) p=100-p;
    p=Math.min(Math.max(p,3),100);
    return `<div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span style="color:#64748b">${l}</span><span style="font-weight:600">${v}</span></div>
      <div style="height:8px;background:#f1f5f9;border-radius:4px;overflow:hidden"><div style="height:100%;width:${p}%;background:${col};border-radius:4px"></div></div>
    </div>`;
  };
  const content=`
    <div style="font-family:Arial,sans-serif;color:#0f172a;max-width:800px;margin:0 auto;padding:40px">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #22d3ee">
        <div style="font-size:22px;font-weight:900;letter-spacing:-1px">SportData</div>
        <div style="color:#64748b;font-size:13px">Profil athlète</div>
        <div style="margin-left:auto;font-size:12px;color:#94a3b8">${new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}</div>
      </div>
      <div style="display:flex;gap:24px;margin-bottom:32px;background:#f8fafc;border-radius:12px;padding:24px">
        ${photoHtml}
        <div>
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:#22d3ee;font-weight:700;margin-bottom:6px">${esc(a.sport)}</div>
          <div style="font-size:24px;font-weight:900;letter-spacing:-0.5px;margin-bottom:6px">${esc(a.name)}</div>
          <div style="font-size:13px;color:#64748b">${[a.age?a.age+' ans':'',a.city,a.country].filter(Boolean).join(' · ')}</div>
          ${a.level?`<div style="margin-top:8px;display:inline-block;background:#fef3c7;color:#92400e;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px">${esc(a.level)}</div>`:''}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:28px">
        <div>
          <h2 style="font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px">Données corporelles</h2>
          <table style="width:100%;border-collapse:collapse">
            ${row('Taille',a.height?a.height+' cm':null)}
            ${row('Poids',a.weight?a.weight+' kg':null)}
            ${row('IMC',bmi)}
            ${row('Envergure',a.armspan?a.armspan+' cm':null)}
            ${row('Long. jambe',a.leglength?a.leglength+' cm':null)}
          </table>
        </div>
        <div>
          <h2 style="font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px">Données physiologiques</h2>
          <table style="width:100%;border-collapse:collapse">
            ${row('FC repos',a.hr?a.hr+' bpm':null)}
            ${row('% Graisse',a.bodyfat?a.bodyfat+'%':null)}
            ${row('Masse musc.',a.muscle?a.muscle+' kg':null)}
            ${row('VO₂ Max',a.vo2?a.vo2+' ml/kg/min':null)}
          </table>
        </div>
      </div>
      <h2 style="font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:16px">Performance</h2>
      ${bar('Sprint 100m',a.sprint,15,'#22d3ee',true)}
      ${bar('Saut vertical (cm)',a.jump,100,'#34d399')}
      ${bar('Vitesse max (km/h)',a.speed,45,'#fbbf24')}
      ${bar('VO₂ Max',a.vo2,80,'#a78bfa')}
      ${bar('Force',a.strength,100,'#f87171')}
      ${bar('Endurance',a.endurance,100,'#60a5fa')}
      ${bar('Souplesse',a.flexibility,100,'#4ade80')}
      ${a.notes?`<div style="margin-top:24px;background:#f8fafc;border-left:3px solid #22d3ee;padding:14px 18px;border-radius:0 8px 8px 0;font-size:13px;color:#475569"><strong>Notes : </strong>${esc(a.notes)}</div>`:''}
      <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">Généré par SportData Africa · ${new Date().toLocaleDateString('fr-FR')}</div>
    </div>`;
  showPDFPreview(content,`Profil de ${a.name}`);
}

function showPDFPreview(html,title){
  const area=document.getElementById('pdf-preview-area');
  document.getElementById('pdf-content').innerHTML=html;
  area.classList.remove('hidden');
  area.scrollIntoView({behavior:'smooth',block:'start'});
  toast(`Rapport "${title}" prêt. Cliquez sur Imprimer.`,'success');
}

function printPDF(){
  const content=document.getElementById('pdf-content').innerHTML;
  const win=window.open('','_blank','width=900,height=700');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>SportData Report</title><style>body{margin:0;padding:0;background:#fff}table{border-collapse:collapse}td,th{vertical-align:top}@media print{@page{margin:20mm}}</style></head><body>${content}</body></html>`);
  win.document.close();
  setTimeout(()=>{win.focus();win.print();},400);
}

function openPinModal(cb, level='admin') {
  _pinCallback      = cb || null;
  _pinRequiredLevel = level;
  _pinDigits        = [];
  _pinAttempts      = 0;

  // Vérifier si encore bloqué
  if (_pinBlockedUntil > Date.now()) {
    const remainSec = Math.ceil((_pinBlockedUntil - Date.now()) / 1000);
    showPinError(`Trop de tentatives. Réessayez dans ${remainSec}s.`);
    return;
  }

  const modal = document.getElementById('pin-modal');
  if (!modal) return;
  document.getElementById('pin-error').textContent = '';
  document.getElementById('pin-error').style.display = 'none';
  updatePinDisplay();
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  // Focus trap
  setTimeout(() => document.getElementById('pin-input-hidden')?.focus(), 100);
}

function closePinModal() {
  const modal = document.getElementById('pin-modal');
  if (modal) modal.classList.add('hidden');
  document.body.style.overflow = '';
  _pinCallback = null;
  _pinDigits   = [];
  updatePinDisplay();
  // Effacer le message d'erreur
  const errEl = document.getElementById('pin-error');
  if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
}

function updatePinDisplay() {
  const dots = document.querySelectorAll('.pin-dot');
  dots.forEach((dot, i) => {
    dot.classList.toggle('filled', i < _pinDigits.length);
    dot.classList.toggle('active', i === _pinDigits.length);
  });
}

function pinKeyPress(val) {
  if (val === 'del') {
    _pinDigits.pop();
    updatePinDisplay();
    return;
  }
  if (_pinDigits.length >= 4) return;
  _pinDigits.push(val);
  updatePinDisplay();

  // Animation flash sur le dot
  const dot = document.querySelectorAll('.pin-dot')[_pinDigits.length - 1];
  if (dot) {
    dot.classList.add('flash');
    setTimeout(() => dot.classList.remove('flash'), 200);
  }

  if (_pinDigits.length === 4) {
    setTimeout(() => validatePin(), 200);
  }
}

/* validatePin() — définie plus bas (version unifiée) */

function showPinError(msg) {
  const el = document.getElementById('pin-error');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function shakePinModal() {
  const box = document.querySelector('.pin-modal-box');
  if (!box) return;
  box.classList.add('pin-shake');
  setTimeout(() => box.classList.remove('pin-shake'), 500);
}

function startPinLockTimer() {
  if (pinLockTimer) clearTimeout(pinLockTimer);
  pinLockTimer = setTimeout(() => {
    pinVerified = false;
    addNotif('🔒 Session PIN expirée. PIN requis au prochain accès.');
    toast('Session PIN expirée.', 'info');
  }, PIN_SESSION_MINUTES * 60 * 1000);
}

function revokePinSession() {
  pinVerified = false;
  if (pinLockTimer) { clearTimeout(pinLockTimer); pinLockTimer = null; }
  toast('Session PIN révoquée.', 'info');
  addNotif('🔒 Session PIN révoquée manuellement.');
}

function showChangePinForm() {
  const form = document.getElementById('change-pin-form');
  if (form) form.classList.toggle('hidden');
}

function validateAthleteForm() {
  const errors  = [];
  const banner  = document.getElementById('form-error-banner');
  const errList = document.getElementById('form-error-list');

  // Champs obligatoires
  const required = [
    { id: 'f-name',   label: 'Nom complet' },
    { id: 'f-gender', label: 'Genre' },
    { id: 'f-age',    label: 'Âge' },
    { id: 'f-sport',  label: 'Sport' },
  ];
  required.forEach(({id, label}) => {
    const el = document.getElementById(id);
    if (!el || !el.value.trim()) {
      errors.push(`${label} est obligatoire.`);
      if (el) el.classList.add('field-error');
    }
  });

  // Âge plausible
  const age = parseInt(document.getElementById('f-age')?.value);
  if (!isNaN(age) && (age < 8 || age > 50)) {
    errors.push('Âge doit être entre 8 et 50 ans.');
  }

  // Email format
  const email = document.getElementById('f-email')?.value.trim();
  if (email && !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    errors.push('Format email invalide.');
  }

  // Vérification valeurs numériques hors plage
  const numericChecks = [
    {id:'f-height',   min:100, max:230, label:'Taille'},
    {id:'f-weight',   min:30,  max:200, label:'Poids'},
    {id:'f-sprint',   min:9.5, max:25,  label:'Sprint 100m'},
    {id:'f-speed',    min:10,  max:50,  label:'Vitesse max'},
    {id:'f-vo2',      min:20,  max:90,  label:'VO₂ Max'},
    {id:'f-hr',       min:30,  max:110, label:'FC repos'},
    {id:'f-strength', min:1,   max:100, label:'Force'},
    {id:'f-endurance',min:1,   max:100, label:'Endurance'},
    {id:'f-flexibility',min:1, max:100, label:'Souplesse'},
  ];
  numericChecks.forEach(({id, min, max, label}) => {
    const el = document.getElementById(id);
    if (!el || !el.value) return;
    const n = parseFloat(el.value);
    if (isNaN(n) || n < min || n > max) {
      errors.push(`${label} : valeur hors plage (${min}–${max}).`);
      el.classList.add('field-error');
    }
  });

  // Cohérence taille/envergure (l'envergure > taille est possible mais > taille+30cm = suspect)
  const h = parseFloat(document.getElementById('f-height')?.value);
  const arm = parseFloat(document.getElementById('f-armspan')?.value);
  if (h && arm && arm > h + 40) {
    errors.push(`Envergure (${arm}cm) paraît incohérente avec la taille (${h}cm).`);
  }

  // Cohérence poids/masse musculaire (masse musc ne peut pas dépasser 60% du poids)
  const w = parseFloat(document.getElementById('f-weight')?.value);
  const mu = parseFloat(document.getElementById('f-muscle')?.value);
  if (w && mu && mu > w * 0.65) {
    errors.push(`Masse musculaire (${mu}kg) incohérente avec le poids (${w}kg).`);
  }

  // Affichage résumé erreurs
  if (banner) {
    banner.classList.toggle('visible', errors.length > 0);
    if (errList) {
      errList.innerHTML = errors.map(e => `<li>${e}</li>`).join('');
    }
  }

  // Scroll vers le banner si erreurs
  if (errors.length > 0) {
    banner?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  return errors.length === 0;
}

function validateField(fieldId) {
  const el  = document.getElementById(fieldId);
  const err = document.getElementById('err-' + fieldId.replace('f-',''));
  const rule = FIELD_RULES[fieldId];
  if (!el || !rule) return true;

  const val = el.value.trim();
  let msg   = '';

  if (rule.required && !val) {
    msg = `${rule.label} est obligatoire.`;
  } else if (val && rule.pattern && !rule.pattern.test(val)) {
    msg = `Format ${rule.label} invalide.`;
  } else if (val && rule.min !== undefined && rule.max !== undefined) {
    if (rule.length) {
      if (val.length < rule.min || val.length > rule.max) {
        msg = `${rule.label} doit comporter entre ${rule.min} et ${rule.max} caractères.`;
      }
    } else {
      const n = parseFloat(val);
      if (isNaN(n)) {
        msg = `${rule.label} doit être un nombre.`;
      } else if (n < rule.min || n > rule.max) {
        msg = `${rule.label} doit être entre ${rule.min} et ${rule.max}.`;
      }
    }
  }

  el.classList.toggle('field-error', !!msg);
  el.classList.toggle('field-ok',    !msg && !!val);
  if (err) {
    err.textContent = msg;
    err.classList.toggle('visible', !!msg);
  }

  updateFormProgress();
  checkDuplicate();
  return !msg;
}

function validateNumericField(el, min, max) {
  const val = parseFloat(el.value);
  const ok  = !el.value || (!isNaN(val) && val >= min && val <= max);
  el.classList.toggle('field-error', !ok && !!el.value);
  el.classList.toggle('field-ok',    ok  && !!el.value);
  if (!ok && el.value) {
    el.title = `Valeur attendue : ${min} – ${max}`;
  } else {
    el.title = '';
  }
  updateFormProgress();
}

function updateFormProgress() {
  const trackable = [
    'f-name','f-age','f-sport','f-email','f-country',
    'f-height','f-weight','f-sprint','f-speed','f-vo2',
    'f-strength','f-endurance','f-hr','f-bodyfat',
  ];
  const filled = trackable.filter(id => {
    const el = document.getElementById(id);
    return el && el.value.trim() !== '';
  }).length;
  const pct = Math.round((filled / trackable.length) * 100);
  const fill = document.getElementById('form-progress-fill');
  const label = document.getElementById('form-progress-pct');
  if (fill)  fill.style.width = pct + '%';
  if (label) label.textContent = pct + '%';

  // Couleur selon complétude
  if (fill) {
    if (pct >= 80)      fill.style.background = 'linear-gradient(90deg,var(--success),#4ade80)';
    else if (pct >= 50) fill.style.background = 'linear-gradient(90deg,var(--accent-2),var(--accent))';
    else                fill.style.background = 'linear-gradient(90deg,#f59e0b,var(--warn))';
  }
}

function checkDuplicate() {
  const name    = (document.getElementById('f-name')?.value || '').trim().toLowerCase();
  const editId  = document.getElementById('f-edit-id')?.value;
  const warn    = document.getElementById('duplicate-warning');
  const msg     = document.getElementById('duplicate-msg');
  if (!warn || !name || name.length < 3) { warn.classList.remove('visible'); return; }

  const similar = athletes.filter(a => {
    if (a.id === editId) return false;
    const aName = a.name.toLowerCase();
    // Similarité : même début, ou distance de Levenshtein faible
    return aName === name ||
           aName.startsWith(name.slice(0,4)) ||
           name.startsWith(aName.slice(0,4)) ||
           levenshtein(aName, name) <= 2;
  });

  if (similar.length > 0) {
    const names = similar.map(a => `"${a.name}" (${a.sport})`).join(', ');
    msg.textContent = `Un athlète similaire existe déjà : ${names}. Vérifiez avant de continuer.`;
    warn.classList.add('visible');
  } else {
    warn.classList.remove('visible');
  }
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({length:m+1}, (_,i)=>Array.from({length:n+1},(_,j)=>i?j?0:i:j));
  for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
    d[i][j] = a[i-1]===b[j-1] ? d[i-1][j-1] : 1+Math.min(d[i-1][j],d[i][j-1],d[i-1][j-1]);
  return d[m][n];
}


document.addEventListener('keydown', function(e) {
  const modal = document.getElementById('pin-modal');
  if (!modal || modal.classList.contains('hidden')) return;
  if (e.key >= '0' && e.key <= '9') { pinKeyPress(e.key); e.preventDefault(); }
  if (e.key === 'Backspace')         { pinKeyPress('del'); e.preventDefault(); }
  if (e.key === 'Escape')            { closePinModal(); }
});
/* ══ FILE READER ════════════════════════════════════════════ */
function readFile(f) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = e => resolve(e.target.result);
    r.onerror = reject;
    r.readAsDataURL(f);
  });
}

/* ══ PIN PIN STORAGE (localStorage pour PIN seulement) ══════ */
// Le PIN reste en localStorage pour simplicité
// Les logs d'accès eux sont en Supabase (renderPinLogs ci-dessus)
function getPinStored(level = 'admin') {
  const key = level === 'pdg' ? 'sportdata_pdg_pin' : 'sportdata_admin_pin';
  const stored = localStorage.getItem(key);
  if (stored && /^\d{4,8}$/.test(stored)) {
    return stored;
  }
  return level === 'pdg' ? DEFAULT_PDG_PIN : DEFAULT_ADMIN_PIN;
}

/* ══ PIN: STOCKAGE & VALIDATION ═════════════════════════════
   Les PIN sont stockés dans localStorage :
   - sportdata_admin_pin = PIN admin / ajout d'athlète (2003)
   - sportdata_pdg_pin   = PIN PDG / accès principal (1205)
   Valeurs par défaut : 2003 (admin), 1205 (PDG)
   ════════════════════════════════════════════════════════════ */

function setPinStored(pin, level = 'admin') {
  const key = level === 'pdg' ? 'sportdata_pdg_pin' : 'sportdata_admin_pin';
  localStorage.setItem(key, pin);
}

/* Validation PIN — cette fonction est la seule à utiliser */
function checkAndValidatePin() {
  const entered    = _pinDigits.join('');
  const adminPin   = getPinStored('admin');
  const pdgPin     = getPinStored('pdg');
  const isAdminPin = entered === adminPin;
  const isPdgPin   = entered === pdgPin;
  const required   = _pinRequiredLevel;

  const valid = required === 'pdg'
    ? isPdgPin
    : required === 'admin'
      ? isAdminPin || isPdgPin
      : false;

  if (valid) {
    /* ── SUCCÈS ── */
    pinVerified  = isPdgPin ? 'pdg' : 'admin';
    _pinAttempts = 0;

    // Fermer le modal proprement
    const modal = document.getElementById('pin-modal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
    _pinDigits = [];
    updatePinDisplay();

    // Effacer l'erreur
    const errEl = document.getElementById('pin-error');
    if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }

    // Log succès en BDD
    if (currentUser) logPinAccess('success');

    // Notification
    toast('Accès accordé ✓', 'success');

    // Exécuter le callback (ouvre la page protégée)
    const cb = _pinCallback;
    _pinCallback = null;
    if (typeof cb === 'function') cb();

  } else {
    /* ── ÉCHEC ── */
    _pinAttempts++;
    _pinDigits = [];
    updatePinDisplay();

    // Log échec en BDD
    if (currentUser) logPinAccess('fail');

    if (_pinAttempts >= PIN_MAX_ATTEMPTS) {
      _pinBlockedUntil = Date.now() + PIN_BLOCK_MINUTES * 60 * 1000;
      _pinAttempts     = 0;
      showPinError(`Trop de tentatives. Réessayez dans ${PIN_BLOCK_MINUTES} minutes.`);
      shakePinModal();
      // Fermer automatiquement après 2.5s
      setTimeout(function() {
        const modal = document.getElementById('pin-modal');
        if (modal) modal.classList.add('hidden');
        document.body.style.overflow = '';
        _pinCallback = null;
      }, 2500);
    } else {
      const rem = PIN_MAX_ATTEMPTS - _pinAttempts;
      showPinError('PIN incorrect. ' + rem + ' tentative' + (rem > 1 ? 's' : '') + ' restante' + (rem > 1 ? 's' : '') + '.');
      shakePinModal();
    }
  }
}

/* Alias pour compatibilité avec l'appel dans pinKeyPress */
function validatePin() {
  checkAndValidatePin();
}


/* ═══════════════════════════════════════════════════════════
   PWA — INSTALLATION
   ═══════════════════════════════════════════════════════════ */
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  // Afficher le bouton installer
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.classList.remove('hidden');
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.classList.add('hidden');
  toast('✅ SportData installé avec succès !', 'success');
});

async function installPWA() {
  if (!deferredInstallPrompt) {
    toast("Menu navigateur → Ajouter à l’écran d’accueil", 'info');
    return;
  }
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === 'accepted') {
    toast('Installation en cours…', 'success');
  }
  deferredInstallPrompt = null;
}
