/* ════════════════════════════════════════
   SIGambling – Client-side Application
   ════════════════════════════════════════ */

const API = '';  // same origin

// ── State ────────────────────────────────────────────────────────────────────
let state = {
  token: localStorage.getItem('sig_token') || null,
  user: JSON.parse(localStorage.getItem('sig_user') || 'null'),
  currentPage: 'home',
  bj: { hand: [], dealerHand: [], deck: [], bet: 0, playing: false },
  rl: { betType: null, betValue: null },
  events: [],
  evFilter: 'all',
};

// ── API helper ────────────────────────────────────────────────────────────────
async function api(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Erreur serveur');
  return data;
}

async function apiForm(path, formData) {
  const headers = {};
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  const res = await fetch(API + path, { method: 'POST', headers, body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Erreur');
  return data;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ── Navigation ────────────────────────────────────────────────────────────────
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.style.display = 'block';
  const navLink = document.querySelector(`[data-page="${page}"]`);
  if (navLink) navLink.classList.add('active');
  state.currentPage = page;

  if (page === 'home') loadHome();
  if (page === 'events') loadEvents();
  if (page === 'leaderboard') loadLeaderboard();
  if (page === 'profile') loadProfile();
  if (page === 'blackjack') initBlackjack();
  if (page === 'roulette') initRoulette();
  if (page === 'admin') loadAdmin();
}

// ── Auth UI ───────────────────────────────────────────────────────────────────
function updateNavUI() {
  const { user } = state;
  const btnLogin = document.getElementById('btn-login');
  const btnReg = document.getElementById('btn-register');
  const userMenu = document.getElementById('user-menu');
  const tokenDisplay = document.getElementById('nav-tokens');
  const btnCreate = document.getElementById('btn-create-event');

  if (user) {
    btnLogin.style.display = 'none';
    btnReg.style.display = 'none';
    userMenu.style.display = 'flex';
    tokenDisplay.style.display = 'flex';
    document.getElementById('token-amount').textContent = Math.floor(user.tokens).toLocaleString();
    document.getElementById('nav-username').textContent = user.username;
    document.getElementById('nav-avatar').textContent = avatarEmojis[user.avatar] || '👤';
    if (btnCreate) btnCreate.style.display = user ? 'inline-flex' : 'none';

    if (user.role === 'admin') {
      let adminLink = document.querySelector('[data-page="admin"]');
      if (!adminLink) {
        adminLink = document.createElement('a');
        adminLink.href = '#';
        adminLink.className = 'nav-link';
        adminLink.dataset.page = 'admin';
        adminLink.textContent = '⚙️ Admin';
        adminLink.setAttribute('onclick', "showPage('admin')");
        document.getElementById('nav-links').appendChild(adminLink);
      }
    }
  } else {
    btnLogin.style.display = 'inline-flex';
    btnReg.style.display = 'inline-flex';
    userMenu.style.display = 'none';
    tokenDisplay.style.display = 'none';
    if (btnCreate) btnCreate.style.display = 'none';
  }
}

function saveAuth(data) {
  state.token = data.access_token;
  state.user = data.user;
  localStorage.setItem('sig_token', data.access_token);
  localStorage.setItem('sig_user', JSON.stringify(data.user));
  updateNavUI();
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('sig_token');
  localStorage.removeItem('sig_user');
  updateNavUI();
  showPage('home');
  toast('À bientôt !', 'info');
}

async function loginSubmit(e) {
  e.preventDefault();
  const fd = new FormData();
  fd.append('username', document.getElementById('login-user').value);
  fd.append('password', document.getElementById('login-pass').value);
  try {
    const data = await apiForm('/api/auth/login', fd);
    saveAuth(data);
    showPage('home');
    const bonus = data.user.last_daily_claim ? '' : ' +100 tokens bonus !';
    toast(`Bienvenue ${data.user.username} !${bonus}`, 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function registerSubmit(e) {
  e.preventDefault();
  try {
    const data = await api('POST', '/api/auth/register', {
      username: document.getElementById('reg-user').value,
      email: document.getElementById('reg-email').value,
      password: document.getElementById('reg-pass').value,
    });
    saveAuth(data);
    showPage('home');
    toast('Compte créé ! 100 tokens de bienvenue 🎉', 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ── Home ──────────────────────────────────────────────────────────────────────
async function loadHome() {
  try {
    const events = await api('GET', '/api/events/?limit=6&status=open');
    const container = document.getElementById('home-events');
    container.innerHTML = events.map(renderEventCard).join('');
    document.getElementById('stat-events').textContent = events.length;
  } catch (e) { /* silent */ }
}

// ── Events ────────────────────────────────────────────────────────────────────
async function loadEvents() {
  const container = document.getElementById('events-list');
  container.innerHTML = '<div class="loading">Chargement...</div>';
  const btnCreate = document.getElementById('btn-create-event');
  if (btnCreate) btnCreate.style.display = state.user ? 'inline-flex' : 'none';
  try {
    const params = state.evFilter !== 'all' ? `?category=${state.evFilter}` : '';
    const events = await api('GET', `/api/events/${params}`);
    state.events = events;
    container.innerHTML = events.length
      ? events.map(renderEventCard).join('')
      : '<div class="empty">Aucun événement trouvé</div>';
  } catch (e) {
    container.innerHTML = '<div class="empty">Erreur de chargement</div>';
  }
}

function filterEvents(cat, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.evFilter = cat;
  loadEvents();
}

function renderEventCard(ev) {
  const outcomes = (ev.outcomes || []).slice(0, 3);
  const statusLabels = { open: '🟢 Ouvert', closed: '🔴 Fermé', resolved: '✅ Résolu', pending: '⏳ En attente' };
  const statusClass = { open: 'status-open', closed: 'status-closed', resolved: 'status-resolved', pending: 'status-closed' };
  const catEmojis = { sports: '⚽', politics: '🏛️', culture: '🎬', esports: '🎮', finance: '📈', other: '🎲' };

  return `
  <div class="event-card" onclick="openEventDetail(${ev.id})">
    <div class="event-card-header">
      <div class="event-category-badge">${catEmojis[ev.category] || '🎲'} ${ev.category}</div>
      <h3>${escHtml(ev.title)}</h3>
    </div>
    <div class="event-card-body">
      <div class="event-pool">Cagnotte: <strong>${Math.floor(ev.total_pool).toLocaleString()} 🪙</strong></div>
      <div class="outcomes-preview">
        ${outcomes.map(o => `
          <div class="outcome-bar">
            <span class="outcome-label">${escHtml(o.label)}</span>
            <span class="outcome-odds">×${o.odds}</span>
          </div>`).join('')}
        ${ev.outcomes.length > 3 ? `<div style="font-size:0.75rem;color:var(--text-muted)">+${ev.outcomes.length - 3} autres...</div>` : ''}
      </div>
      <div class="event-status-badge ${statusClass[ev.status] || ''}">${statusLabels[ev.status] || ev.status}</div>
    </div>
  </div>`;
}

async function openEventDetail(id) {
  showPage('event-detail');
  const container = document.getElementById('event-detail-content');
  container.innerHTML = '<div class="loading">Chargement...</div>';
  try {
    const ev = await api('GET', `/api/events/${id}`);
    renderEventDetail(ev, container);
  } catch (e) {
    container.innerHTML = '<div class="empty">Erreur</div>';
  }
}

let selectedOutcome = null;

function renderEventDetail(ev, container) {
  selectedOutcome = null;
  const catEmojis = { sports: '⚽', politics: '🏛️', culture: '🎬', esports: '🎮', finance: '📈', other: '🎲' };
  const statusLabels = { open: '🟢 Ouvert', closed: '🔴 Fermé', resolved: '✅ Résolu', pending: '⏳ En attente' };

  const winningOutcome = ev.winning_outcome_id
    ? ev.outcomes.find(o => o.id === ev.winning_outcome_id)
    : null;

  container.innerHTML = `
    <div class="event-detail-header">
      <div class="event-category-badge">${catEmojis[ev.category] || '🎲'} ${ev.category}</div>
      <h1>${escHtml(ev.title)}</h1>
      <div class="event-meta">
        <span class="event-status-badge ${ev.status === 'open' ? 'status-open' : ev.status === 'resolved' ? 'status-resolved' : 'status-closed'}">${statusLabels[ev.status]}</span>
        <span style="color:var(--text-muted);font-size:0.85rem">Cagnotte: <strong style="color:var(--accent)">${Math.floor(ev.total_pool).toLocaleString()} 🪙</strong></span>
        ${ev.closes_at ? `<span style="color:var(--text-muted);font-size:0.85rem">Clôture: ${new Date(ev.closes_at).toLocaleDateString('fr')}</span>` : ''}
      </div>
      ${ev.description ? `<p style="margin-top:0.75rem;color:var(--text-muted)">${escHtml(ev.description)}</p>` : ''}
      ${winningOutcome ? `<div class="event-status-badge status-open" style="margin-top:0.75rem">🏆 Résultat gagnant: ${escHtml(winningOutcome.label)}</div>` : ''}
    </div>
    <div class="event-detail-body">
      <div>
        <h3 style="margin-bottom:1rem;font-weight:700">Choisissez un outcome</h3>
        <div class="outcomes-list" id="detail-outcomes">
          ${ev.outcomes.map(o => `
            <div class="outcome-item" id="outcome-${o.id}" 
              onclick="${ev.status === 'open' ? `selectOutcome(${o.id}, ${o.odds}, '${escHtml(o.label).replace(/'/g,"\\'")}')` : ''}"
              style="${ev.status !== 'open' ? 'cursor:default' : ''}">
              <div>
                <div class="outcome-item-label">${escHtml(o.label)}</div>
                <div class="outcome-item-stats">Misé: ${Math.floor(o.total_staked).toLocaleString()} 🪙</div>
              </div>
              <div style="text-align:right">
                <div class="outcome-item-odds">×${o.odds}</div>
                ${ev.winning_outcome_id === o.id ? '<div style="color:var(--green);font-size:0.8rem;font-weight:700">✓ GAGNANT</div>' : ''}
              </div>
            </div>`).join('')}
        </div>
        ${ev.recent_bets && ev.recent_bets.length > 0 ? `
          <div class="bet-history">
            <h3>Paris récents</h3>
            ${ev.recent_bets.map(b => `
              <div class="bet-history-item">
                <span>${b.user_id ? '👤' : ''} ${escHtml(b.outcome)}</span>
                <span>${b.amount} 🪙 @ ×${b.odds_at_bet}</span>
                <span class="badge badge-${b.status}">${b.status}</span>
              </div>`).join('')}
          </div>` : ''}
      </div>
      <div class="bet-panel" id="bet-panel">
        ${ev.status === 'open' ? `
          <h3>Placer un pari</h3>
          <p id="selected-outcome-label" style="color:var(--text-muted);font-size:0.85rem;margin-bottom:0.75rem">
            Sélectionnez un outcome →
          </p>
          <div class="form-group">
            <label>Mise (tokens)</label>
            <input type="number" id="bet-amount" value="10" min="1" max="${state.user ? Math.floor(state.user.tokens) : 1000}" 
              oninput="updateBetSummary()" style="width:100%" />
          </div>
          <div class="bet-summary" id="bet-summary">
            <div class="row"><span>Mise</span><span id="summary-stake">0 🪙</span></div>
            <div class="row"><span>Cote</span><span id="summary-odds">×0</span></div>
            <div class="row total"><span>Gain potentiel</span><span id="summary-win">0 🪙</span></div>
          </div>
          <button class="btn btn-primary btn-full" onclick="placeBet(${ev.id})" id="btn-place-bet" disabled>
            ${state.user ? 'Confirmer le pari' : 'Connexion requise'}
          </button>
          ${state.user ? `<p style="font-size:0.75rem;color:var(--text-muted);text-align:center;margin-top:0.5rem">Solde: ${Math.floor(state.user.tokens).toLocaleString()} 🪙</p>` : ''}
        ` : `<p style="color:var(--text-muted)">Les paris sont ${ev.status === 'resolved' ? 'terminés' : 'fermés'} pour cet événement.</p>`}
      </div>
    </div>`;
}

function selectOutcome(id, odds, label) {
  if (!state.user) { toast('Connectez-vous pour parier', 'error'); showPage('login'); return; }
  document.querySelectorAll('.outcome-item').forEach(el => el.classList.remove('selected'));
  document.getElementById(`outcome-${id}`).classList.add('selected');
  selectedOutcome = { id, odds, label };
  document.getElementById('selected-outcome-label').innerHTML = `<strong>${escHtml(label)}</strong> sélectionné(e)`;
  document.getElementById('btn-place-bet').disabled = false;
  updateBetSummary();
}

function updateBetSummary() {
  const amount = parseFloat(document.getElementById('bet-amount')?.value || 0);
  const odds = selectedOutcome?.odds || 0;
  document.getElementById('summary-stake').textContent = `${amount} 🪙`;
  document.getElementById('summary-odds').textContent = `×${odds}`;
  document.getElementById('summary-win').textContent = `${(amount * odds).toFixed(2)} 🪙`;
}

async function placeBet(eventId) {
  if (!state.user) { showPage('login'); return; }
  if (!selectedOutcome) { toast('Sélectionnez un outcome', 'error'); return; }
  const amount = parseFloat(document.getElementById('bet-amount').value);
  if (isNaN(amount) || amount <= 0) { toast('Mise invalide', 'error'); return; }
  try {
    const res = await api('POST', `/api/events/${eventId}/bet`, {
      outcome_id: selectedOutcome.id,
      amount,
    });
    state.user.tokens = res.tokens_remaining;
    localStorage.setItem('sig_user', JSON.stringify(state.user));
    updateNavUI();
    toast(`Pari placé ! Gain potentiel: ${res.potential_win} 🪙`, 'success');
    openEventDetail(eventId);
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ── Create Event Modal ────────────────────────────────────────────────────────
function openCreateEvent() {
  if (!state.user) { showPage('login'); return; }
  document.getElementById('modal-create-event').style.display = 'flex';
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

function addOutcomeInput() {
  const container = document.getElementById('outcomes-inputs');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'outcome-input';
  input.placeholder = `Résultat ${container.children.length + 1}`;
  container.appendChild(input);
}

async function submitCreateEvent(e) {
  e.preventDefault();
  const outcomes = Array.from(document.querySelectorAll('.outcome-input'))
    .map(i => ({ label: i.value.trim() }))
    .filter(o => o.label);

  if (outcomes.length < 2) { toast('Au moins 2 résultats requis', 'error'); return; }

  const closesAt = document.getElementById('ev-closes').value;

  try {
    await api('POST', '/api/events/', {
      title: document.getElementById('ev-title').value,
      description: document.getElementById('ev-desc').value,
      category: document.getElementById('ev-category').value,
      outcomes,
      closes_at: closesAt ? new Date(closesAt).toISOString() : null,
    });
    closeModal('modal-create-event');
    document.getElementById('create-event-form').reset();
    toast('Événement soumis ! En attente de validation admin.', 'success');
    if (state.user?.role === 'admin') loadEvents();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
async function loadLeaderboard() {
  const container = document.getElementById('leaderboard-list');
  container.innerHTML = '<div class="loading">Chargement...</div>';
  try {
    const data = await api('GET', '/api/user/leaderboard');
    container.innerHTML = data.map(u => `
      <div class="leaderboard-item">
        <div class="lb-rank ${u.rank <= 3 ? `lb-rank-${u.rank}` : ''}">${u.rank <= 3 ? ['🥇','🥈','🥉'][u.rank-1] : u.rank}</div>
        <div class="lb-avatar">${avatarEmojis[u.avatar] || '👤'}</div>
        <div class="lb-info">
          <div class="lb-name">${escHtml(u.username)} ${u.badge ? `<span style="font-size:0.8rem">${u.badge}</span>` : ''}</div>
          <div class="lb-level">Niveau ${u.level}</div>
        </div>
        <div class="lb-stats">
          <div class="lb-wins">${u.total_wins} victoires</div>
        </div>
      </div>`).join('');
  } catch (e) {
    container.innerHTML = '<div class="empty">Erreur</div>';
  }
}

// ── Profile ───────────────────────────────────────────────────────────────────
const avatarEmojis = {
  default: '👤', wolf: '🐺', eagle: '🦅', shark: '🦈', lion: '🦁',
  fox: '🦊', bear: '🐻', dragon: '🐉', ninja: '🥷', pirate: '🏴‍☠️',
  astronaut: '👨‍🚀', robot: '🤖',
};

async function loadProfile() {
  if (!state.user) { showPage('login'); return; }
  const container = document.getElementById('profile-content');
  container.innerHTML = '<div class="loading">Chargement...</div>';

  try {
    const [profileData, challenges, transactions, bets] = await Promise.all([
      api('GET', `/api/user/profile/${state.user.username}`),
      api('GET', '/api/user/challenges'),
      api('GET', '/api/user/transactions?limit=20'),
      api('GET', '/api/events/my/bets?limit=20'),
    ]);

    const xpThresholds = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000, 20000];
    const nextXP = profileData.level < xpThresholds.length
      ? xpThresholds[profileData.level]
      : xpThresholds[xpThresholds.length - 1] + (profileData.level - xpThresholds.length + 1) * 10000;
    const xpPct = Math.min(100, (profileData.xp / nextXP) * 100);

    container.innerHTML = `
    <div class="profile-grid">
      <div class="profile-card">
        <div class="profile-avatar">${avatarEmojis[profileData.avatar] || '👤'}</div>
        <div class="profile-name">${escHtml(profileData.username)}</div>
        <div class="profile-level">Niveau ${profileData.level}</div>
        <div class="xp-bar-container">
          <div class="xp-bar" style="width:${xpPct}%"></div>
        </div>
        <div style="font-size:0.75rem;color:var(--text-muted);">${profileData.xp} / ${nextXP} XP</div>
        <div class="profile-stats">
          <div class="profile-stat"><div class="profile-stat-label">Paris</div><div class="profile-stat-value">${profileData.total_bets}</div></div>
          <div class="profile-stat"><div class="profile-stat-label">Victoires</div><div class="profile-stat-value" style="color:var(--green)">${profileData.total_wins}</div></div>
          <div class="profile-stat"><div class="profile-stat-label">Misé</div><div class="profile-stat-value">${Math.floor(profileData.total_wagered).toLocaleString()} 🪙</div></div>
          <div class="profile-stat"><div class="profile-stat-label">Gagné</div><div class="profile-stat-value" style="color:var(--accent)">${Math.floor(profileData.total_won).toLocaleString()} 🪙</div></div>
        </div>
        <div style="margin-top:1rem">
          <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.5rem">Choisir un avatar</div>
          <div class="avatar-grid" id="avatar-grid">
            ${Object.entries(avatarEmojis).map(([k, v]) => `
              <div class="avatar-option ${state.user?.avatar === k ? 'selected' : ''}" onclick="changeAvatar('${k}', this)" title="${k}">
                ${v}
              </div>`).join('')}
          </div>
        </div>
      </div>
      <div>
        <div class="profile-tabs">
          <div class="profile-tab active" onclick="switchTab('bets', this)">Paris</div>
          <div class="profile-tab" onclick="switchTab('challenges', this)">Défis</div>
          <div class="profile-tab" onclick="switchTab('transactions', this)">Transactions</div>
        </div>
        <div class="profile-panel active" id="tab-bets">
          ${bets.length === 0 ? '<div class="empty">Aucun pari effectué</div>' :
            bets.map(b => `
              <div class="tx-item">
                <div>
                  <div style="font-weight:600">${escHtml(b.event_title || '')}</div>
                  <div style="font-size:0.75rem;color:var(--text-muted)">${escHtml(b.outcome)} · ×${b.odds_at_bet}</div>
                </div>
                <div style="text-align:right">
                  <div>${b.amount} 🪙</div>
                  <span class="badge badge-${b.status}">${b.status === 'won' ? '✓ Gagné' : b.status === 'lost' ? '✗ Perdu' : '⧖ Actif'}</span>
                </div>
              </div>`).join('')}
        </div>
        <div class="profile-panel" id="tab-challenges">
          ${challenges.map(c => `
            <div class="challenge-card">
              <div class="challenge-header">
                <div class="challenge-title">${escHtml(c.title)}</div>
                <div class="challenge-type">${c.type}</div>
              </div>
              <div style="font-size:0.8rem;color:var(--text-muted)">${escHtml(c.description)}</div>
              <div class="progress-bar-container">
                <div class="progress-bar" style="width:${Math.min(100, (c.progress / c.goal) * 100)}%"></div>
              </div>
              <div class="challenge-footer">
                <span style="font-size:0.8rem;color:var(--text-muted)">${c.progress} / ${c.goal}</span>
                <span class="challenge-reward">+${c.reward_tokens} 🪙 +${c.reward_xp} XP</span>
                ${c.completed && !c.claimed
                  ? `<button class="btn btn-primary btn-small" onclick="claimChallenge(${c.id})">Réclamer</button>`
                  : c.claimed ? '<span style="color:var(--green);font-size:0.75rem">✓ Réclamé</span>' : ''}
              </div>
            </div>`).join('')}
        </div>
        <div class="profile-panel" id="tab-transactions">
          ${transactions.map(t => `
            <div class="tx-item">
              <div>
                <div style="font-weight:600">${escHtml(t.description || t.type)}</div>
                <div style="font-size:0.75rem;color:var(--text-muted)">${new Date(t.created_at).toLocaleDateString('fr')}</div>
              </div>
              <div class="${t.amount >= 0 ? 'tx-positive' : 'tx-negative'}">${t.amount >= 0 ? '+' : ''}${t.amount} 🪙</div>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
  } catch (e) {
    container.innerHTML = '<div class="empty">Erreur de chargement</div>';
  }
}

function switchTab(tab, btn) {
  document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.profile-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(`tab-${tab}`).classList.add('active');
}

async function changeAvatar(avatar, el) {
  if (!state.user) return;
  try {
    const data = await api('PATCH', '/api/user/profile', { avatar });
    state.user.avatar = avatar;
    localStorage.setItem('sig_user', JSON.stringify(state.user));
    updateNavUI();
    document.querySelectorAll('.avatar-option').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
    toast('Avatar mis à jour !', 'success');
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function claimChallenge(challengeId) {
  try {
    const data = await api('POST', '/api/user/challenges/claim', { challenge_id: challengeId });
    state.user.tokens = data.tokens;
    localStorage.setItem('sig_user', JSON.stringify(state.user));
    updateNavUI();
    toast('Récompense réclamée ! 🎉', 'success');
    loadProfile();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ── BLACKJACK ─────────────────────────────────────────────────────────────────
function initBlackjack() {
  state.bj = { hand: [], dealerHand: [], deck: [], bet: 0, playing: false };
  document.getElementById('player-hand').innerHTML = '';
  document.getElementById('dealer-hand').innerHTML = '';
  document.getElementById('player-value').textContent = '';
  document.getElementById('dealer-value').textContent = '';
  document.getElementById('bj-result-banner').style.display = 'none';
  document.getElementById('bj-controls').style.display = 'flex';
  document.getElementById('bj-actions').style.display = 'none';
}

async function bjStart() {
  if (!state.user) { showPage('login'); return; }
  const bet = parseFloat(document.getElementById('bj-bet').value);
  if (!bet || bet <= 0) { toast('Mise invalide', 'error'); return; }

  document.getElementById('bj-controls').style.display = 'none';
  document.getElementById('bj-result-banner').style.display = 'none';
  document.getElementById('player-hand').innerHTML = '';
  document.getElementById('dealer-hand').innerHTML = '';

  try {
    const data = await api('POST', '/api/casino/blackjack/start', { bet });
    state.bj = {
      hand: data.player_hand,
      dealerHand: data.dealer_hand,
      deck: data.deck,
      bet,
      playing: data.status === 'playing',
    };
    state.user.tokens = data.tokens;
    localStorage.setItem('sig_user', JSON.stringify(state.user));
    updateNavUI();

    renderBjHands(data.player_hand, [data.dealer_hand[0]], data.player_value, null);

    if (data.status !== 'playing') {
      showBjResult(data.result, data.payout, data.dealer_value, data.dealer_hand, data.player_value);
    } else {
      document.getElementById('bj-actions').style.display = 'flex';
      document.getElementById('btn-double').disabled = state.user.tokens < bet;
    }
  } catch (e) {
    toast(e.message, 'error');
    document.getElementById('bj-controls').style.display = 'flex';
  }
}

async function bjAction(action) {
  if (!state.bj.playing) return;
  document.getElementById('bj-actions').querySelectorAll('button').forEach(b => b.disabled = true);

  try {
    const data = await api('POST', '/api/casino/blackjack/action', {
      bet: state.bj.bet,
      player_hand: state.bj.hand,
      dealer_hand: state.bj.dealerHand,
      deck: state.bj.deck,
      action,
    });

    state.user.tokens = data.tokens;
    localStorage.setItem('sig_user', JSON.stringify(state.user));
    updateNavUI();

    if (data.status === 'playing') {
      state.bj.hand = data.player_hand;
      renderBjHands(data.player_hand, [state.bj.dealerHand[0]], data.player_value, null);
      document.getElementById('bj-actions').querySelectorAll('button').forEach(b => b.disabled = false);
      document.getElementById('btn-double').disabled = true; // can only double at start
    } else {
      state.bj.playing = false;
      renderBjHands(data.player_hand, data.dealer_hand, data.player_value, data.dealer_value);
      showBjResult(data.result, data.payout, data.dealer_value, data.dealer_hand, data.player_value);
    }
  } catch (e) {
    toast(e.message, 'error');
    document.getElementById('bj-actions').querySelectorAll('button').forEach(b => b.disabled = false);
  }
}

function renderBjHands(playerHand, dealerVisible, playerValue, dealerValue) {
  document.getElementById('player-hand').innerHTML = playerHand.map(renderCard).join('');
  document.getElementById('dealer-hand').innerHTML = dealerVisible.map(renderCard).join('') +
    (dealerVisible.length < 2 ? '<div class="playing-card back">🂠</div>' : '');
  document.getElementById('player-value').textContent = playerValue || '';
  document.getElementById('dealer-value').textContent = dealerValue ? `(${dealerValue})` : '';
}

function renderCard(card) {
  const isRed = card.suit === '♥' || card.suit === '♦';
  return `<div class="playing-card ${isRed ? 'red' : ''}">
    <div>${card.rank}</div><div>${card.suit}</div>
  </div>`;
}

function showBjResult(result, payout, dealerValue, dealerHand, playerValue) {
  document.getElementById('dealer-hand').innerHTML = dealerHand.map(renderCard).join('');
  document.getElementById('dealer-value').textContent = `(${dealerValue})`;
  document.getElementById('player-value').textContent = playerValue || '';
  document.getElementById('bj-actions').style.display = 'none';

  const labels = {
    win: '🏆 Vous gagnez !', lose: '💀 Perdu…',
    push: '🤝 Égalité !', blackjack: '🎉 BLACKJACK !', dealer_blackjack: '😱 Blackjack croupier',
    bust: '💥 Dépassé !',
  };
  const classes = {
    win: 'result-win', lose: 'result-lose', push: 'result-push',
    blackjack: 'result-win', dealer_blackjack: 'result-lose', bust: 'result-lose',
  };

  const banner = document.getElementById('bj-result-banner');
  banner.className = `result-banner ${classes[result] || 'result-push'}`;
  banner.textContent = `${labels[result] || result}${payout > 0 ? ` +${payout} 🪙` : ''}`;
  banner.style.display = 'block';

  setTimeout(() => {
    document.getElementById('bj-controls').style.display = 'flex';
  }, 1500);
}

// ── ROULETTE ──────────────────────────────────────────────────────────────────
const ROULETTE_REDS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

function initRoulette() {
  state.rl = { betType: null, betValue: null };
  drawRouletteWheel(null);

  // Build number grid
  const container = document.getElementById('straight-numbers');
  if (container.children.length === 0) {
    for (let i = 0; i <= 36; i++) {
      const btn = document.createElement('div');
      btn.className = `straight-num ${i === 0 ? 'num-green' : ROULETTE_REDS.has(i) ? 'num-red' : ''}`;
      btn.textContent = i;
      btn.onclick = () => {
        document.querySelectorAll('.straight-num').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectRouletteBet('straight', String(i), null);
      };
      container.appendChild(btn);
    }
  }
}

function selectRouletteBet(type, value, btn) {
  state.rl = { betType: type, betValue: value };
  if (btn) {
    document.querySelectorAll('.rl-bet-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.querySelectorAll('.straight-num').forEach(b => b.classList.remove('selected'));
  }
}

function drawRouletteWheel(highlightNumber) {
  const canvas = document.getElementById('roulette-canvas');
  const ctx = canvas.getContext('2d');
  const cx = 170, cy = 170, radius = 155, innerRadius = 60;
  const segments = 37;
  const angle = (2 * Math.PI) / segments;

  // Rotate so 0 is at top
  ctx.clearRect(0, 0, 340, 340);

  for (let i = 0; i < segments; i++) {
    const num = i; // 0 to 36 positioned sequentially for simplicity
    const startAngle = i * angle - Math.PI / 2;
    const endAngle = startAngle + angle;

    // Color
    let color = '#1a1a1a';
    if (num === 0) color = '#166534';
    else if (ROULETTE_REDS.has(num)) color = '#991b1b';

    if (highlightNumber === num) color = '#fbbf24';

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Number label
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(startAngle + angle / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText(num, radius - 8, 4);
    ctx.restore();
  }

  // Inner circle
  ctx.beginPath();
  ctx.arc(cx, cy, innerRadius, 0, 2 * Math.PI);
  ctx.fillStyle = '#0a0e1a';
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 2;
  ctx.stroke();
}

let isSpinning = false;

async function spinRoulette() {
  if (!state.user) { showPage('login'); return; }
  if (!state.rl.betType) { toast('Choisissez une mise', 'error'); return; }
  if (isSpinning) return;

  const bet = parseFloat(document.getElementById('rl-bet').value);
  if (!bet || bet <= 0) { toast('Mise invalide', 'error'); return; }

  isSpinning = true;
  document.getElementById('btn-spin').disabled = true;
  document.getElementById('roulette-result').style.display = 'none';
  document.getElementById('roulette-result-number').textContent = '?';

  // Animate spin
  let frame = 0;
  const totalFrames = 80;
  const spinAnim = setInterval(() => {
    drawRouletteWheel(null);
    frame++;
    if (frame >= totalFrames) clearInterval(spinAnim);
  }, 30);

  try {
    const data = await api('POST', '/api/casino/roulette/spin', {
      bet,
      bet_type: state.rl.betType,
      bet_value: state.rl.betValue,
    });

    clearInterval(spinAnim);

    // Show result
    setTimeout(() => {
      drawRouletteWheel(data.number);
      document.getElementById('roulette-result-number').textContent = data.number;
      state.user.tokens = data.tokens;
      localStorage.setItem('sig_user', JSON.stringify(state.user));
      updateNavUI();

      const resultEl = document.getElementById('roulette-result');
      resultEl.style.display = 'block';
      if (data.result === 'win') {
        resultEl.style.background = 'rgba(16,185,129,0.2)';
        resultEl.style.color = 'var(--green)';
        resultEl.style.border = '1px solid var(--green)';
        resultEl.innerHTML = `🏆 Numéro ${data.number} (${data.color}) — Gagné ${data.payout} 🪙 !`;
        toast(`Gagné ! +${data.payout} 🪙`, 'success');
      } else {
        resultEl.style.background = 'rgba(239,68,68,0.2)';
        resultEl.style.color = 'var(--red)';
        resultEl.style.border = '1px solid var(--red)';
        resultEl.innerHTML = `💀 Numéro ${data.number} (${data.color}) — Perdu`;
        toast(`Perdu. Numéro: ${data.number}`, 'error');
      }

      isSpinning = false;
      document.getElementById('btn-spin').disabled = false;
    }, 600);
  } catch (e) {
    clearInterval(spinAnim);
    toast(e.message, 'error');
    isSpinning = false;
    document.getElementById('btn-spin').disabled = false;
  }
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────
async function loadAdmin() {
  if (!state.user || state.user.role !== 'admin') {
    showPage('home'); return;
  }
  try {
    const pending = await api('GET', '/api/events/admin/pending');
    const pending_el = document.getElementById('admin-pending-events');
    pending_el.innerHTML = pending.length === 0 ? '<p style="color:var(--text-muted)">Aucun événement en attente</p>' :
      pending.map(ev => `
        <div class="admin-event-item">
          <h3>${escHtml(ev.title)}</h3>
          <p>${escHtml(ev.description || '')} · par ${escHtml(ev.creator || 'inconnu')}</p>
          <div class="admin-actions">
            <button class="btn btn-approve" onclick="adminAction(${ev.id},'approve')">✓ Approuver</button>
            <button class="btn btn-reject" onclick="adminAction(${ev.id},'reject')">✗ Refuser</button>
          </div>
        </div>`).join('');
  } catch (e) { /* silent */ }

  try {
    const open_events = await api('GET', '/api/events/?status=open');
    const resolve_el = document.getElementById('admin-resolve-events');
    resolve_el.innerHTML = open_events.length === 0 ? '<p style="color:var(--text-muted)">Aucun événement ouvert</p>' :
      open_events.map(ev => `
        <div class="admin-event-item">
          <h3>${escHtml(ev.title)}</h3>
          <div class="admin-actions">
            ${ev.outcomes.map(o => `
              <button class="btn btn-secondary btn-small" onclick="adminResolve(${ev.id}, ${o.id}, '${escHtml(o.label).replace(/'/g,"\\'")}')">
                🏆 ${escHtml(o.label)}
              </button>`).join('')}
          </div>
        </div>`).join('');
  } catch (e) { /* silent */ }
}

async function adminAction(id, action) {
  try {
    await api('PATCH', `/api/events/${id}/${action}`);
    toast(`Événement ${action === 'approve' ? 'approuvé' : 'refusé'}`, 'success');
    loadAdmin();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function adminResolve(eventId, outcomeId, label) {
  if (!confirm(`Confirmer: "${label}" est le résultat gagnant ?`)) return;
  try {
    const data = await api('PATCH', `/api/events/${eventId}/resolve/${outcomeId}`);
    toast(`Événement résolu ! Payout total: ${data.total_payout} 🪙`, 'success');
    loadAdmin();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateNavUI();
  showPage('home');

  // Refresh token data from server if logged in
  if (state.token) {
    api('GET', '/api/auth/me').then(user => {
      if (user) {
        state.user = user;
        localStorage.setItem('sig_user', JSON.stringify(user));
        updateNavUI();
      }
    }).catch(() => {
      logout();
    });
  }
});
