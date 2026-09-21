/* ===================================================================
   网页盒子 · iOS WebApp Launcher — app.js
   State machine: home <-> webview ; sheets overlay both.
   Persistence: localStorage["ios_webapp_launcher_apps"]
   =================================================================== */

'use strict';

/* ---------- Constants & preset data ---------- */
const STORAGE_KEY = 'ios_webapp_launcher_apps';
const DOCK_KEY = 'ios_webapp_launcher_dock';

const COLOR_TILES = [
  { id: 1, css: 'var(--tile-1)' }, // orange
  { id: 2, css: 'var(--tile-2)' }, // blue
  { id: 3, css: 'var(--tile-3)' }, // green
  { id: 4, css: 'var(--tile-4)' }, // purple
  { id: 5, css: 'var(--tile-5)' }, // pink
  { id: 6, css: 'var(--tile-6)' }, // black
  { id: 7, css: 'var(--tile-7)' }, // yellow
  { id: 8, css: 'var(--tile-8)' }, // violet
];

const EMOJI_PRESETS = ['🌐','🔗','📰','📺','✉️','💬','🎮','🛒','📚','🎵','💼','🔧'];

const DEFAULT_APPS = [
  { id: 'a1', name: 'GitHub',   url: 'https://github.com',           color: 6, style: 'favicon', emoji: '🐙', addedAt: Date.now() - 7000000, pinned: true },
  { id: 'a2', name: 'X',        url: 'https://x.com',                 color: 6, style: 'letter',  emoji: '✖️', addedAt: Date.now() - 6000000, pinned: true },
  { id: 'a3', name: 'YouTube',  url: 'https://www.youtube.com',      color: 5, style: 'favicon', emoji: '▶️', addedAt: Date.now() - 5000000, pinned: true },
  { id: 'a4', name: 'ChatGPT',  url: 'https://chat.openai.com',      color: 4, style: 'favicon', emoji: '🤖', addedAt: Date.now() - 4000000, pinned: true },
  { id: 'a5', name: 'Gmail',    url: 'https://mail.google.com',      color: 2, style: 'favicon', emoji: '✉️', addedAt: Date.now() - 3000000, pinned: false },
  { id: 'a6', name: 'Notion',   url: 'https://www.notion.so',        color: 6, style: 'favicon', emoji: '📝', addedAt: Date.now() - 2000000, pinned: false },
  { id: 'a7', name: 'Bilibili', url: 'https://www.bilibili.com',     color: 5, style: 'favicon', emoji: '📺', addedAt: Date.now() - 1000000, pinned: false },
  { id: 'a8', name: 'Figma',    url: 'https://www.figma.com',        color: 4, style: 'favicon', emoji: '🎨', addedAt: Date.now() - 500000,  pinned: false },
];

/* ---------- App state ---------- */
const state = {
  apps: [],          // all saved apps
  currentView: 'home',
  currentAppId: null,// app open in webview
  history: [],       // navigation history within current app session
  historyIdx: -1,
  editing: false,    // home edit mode (jiggle)
  editingApp: null,  // when in "edit existing app" sheet
  selectedColor: 2,  // current color in add/edit sheet
  selectedStyle: 'favicon',
  switcherOpen: false,
};

/* ---------- DOM cache ---------- */
const $ = (id) => document.getElementById(id);
const els = {
  appGrid: $('appGrid'),
  dock: $('dock'),
  searchInput: $('searchInput'),
  statusTime: $('statusTime'),

  viewHome: $('viewHome'),
  viewWebview: $('viewWebview'),

  wwUrl: $('wwUrl'),
  wwBack: $('wwBack'),
  wwForward: $('wwForward'),
  wwReload: $('wwReload'),
  wwShare: $('wwShare'),
  webviewFrame: $('webviewFrame'),
  webviewBlocked: $('webviewBlocked'),
  webviewLoading: $('webviewLoading'),
  blockFav: $('blockFav'),
  blockTitle: $('blockTitle'),
  blockOpen: $('blockOpen'),
  toolBack: $('toolBack'),
  toolForward: $('toolForward'),
  toolShare: $('toolShare'),
  toolSwitch: $('toolSwitch'),
  toolHome: $('toolHome'),
  switchBadge: $('switchBadge'),

  sheetOverlay: $('sheetOverlay'),
  sheetAdd: $('sheetAdd'),
  sheetAddTitle: $('sheetAddTitle'),
  sheetSwitcher: $('sheetSwitcher'),
  sheetContext: $('sheetContext'),
  switcherList: $('switcherList'),
  ctxIcon: $('ctxIcon'),
  ctxName: $('ctxName'),
  ctxUrl: $('ctxUrl'),
  ctxPinLabel: $('ctxPinLabel'),

  inputUrl: $('inputUrl'),
  inputName: $('inputName'),
  inputEmoji: $('inputEmoji'),
  iconPreview: $('iconPreview'),
  iconPreviewName: $('iconPreviewName'),
  colorSwatches: $('colorSwatches'),
  styleTabs: $('styleTabs'),
  fieldEmoji: $('fieldEmoji'),
  btnSaveApp: $('btnSaveApp'),
  btnCancelAdd: $('btnCancelAdd'),
  btnCloseSwitcher: $('btnCloseSwitcher'),
  btnNewFromSwitcher: $('btnNewFromSwitcher'),
  ctxOpen: $('ctxOpen'),
  ctxEdit: $('ctxEdit'),
  ctxPin: $('ctxPin'),
  ctxDelete: $('ctxDelete'),

  toast: $('toast'),
};

/* ---------- Persistence ---------- */
function loadApps() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      state.apps = DEFAULT_APPS.slice();
      saveApps();
    } else {
      state.apps = JSON.parse(raw);
    }
  } catch (e) {
    state.apps = DEFAULT_APPS.slice();
  }
}
function saveApps() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.apps)); } catch (e) {}
}

/* ---------- Utility helpers ---------- */
function uid() { return 'a' + Math.random().toString(36).slice(2, 9); }

function normalizeUrl(input) {
  let v = (input || '').trim();
  if (!v) return '';
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
  return v;
}

function getDomain(url) {
  try {
    const u = new URL(normalizeUrl(url));
    return u.hostname.replace(/^www\./, '');
  } catch (e) { return ''; }
}

function faviconUrl(url, size = 64) {
  const d = getDomain(url);
  if (!d) return '';
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=${size}`;
}

function getInitial(name) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

function colorTileCss(colorId) {
  const t = COLOR_TILES.find(c => c.id === colorId);
  return t ? t.css : COLOR_TILES[1].css;
}

function showToast(text, ms = 1500) {
  els.toast.textContent = text;
  els.toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.remove('show'), ms);
}

/* ---------- Render: app icon tile (returns HTML string for tile content) ---------- */
function tileInner(app) {
  if (app.style === 'favicon') {
    const fav = faviconUrl(app.url);
    return `<img src="${fav}" alt="" onerror="this.style.display='none'; this.parentNode.textContent='${getInitial(app.name)}';" />`;
  }
  if (app.style === 'letter') {
    return getInitial(app.name);
  }
  // emoji
  return app.emoji || '🌐';
}

/* ---------- Render: home grid ---------- */
function renderHome() {
  const filter = (els.searchInput.value || '').trim().toLowerCase();
  const list = state.apps.filter(a => !filter ||
    a.name.toLowerCase().includes(filter) ||
    getDomain(a.url).includes(filter));

  const cells = list.map(a => `
    <div class="app-cell" data-id="${a.id}">
      <div class="badge-delete" data-delete="${a.id}">×</div>
      <div class="tile" style="background:${colorTileCss(a.color)}">${tileInner(a)}</div>
      <div class="label">${escapeHtml(a.name)}</div>
    </div>
  `).join('');

  const addCell = filter ? '' : `
    <div class="app-cell add" data-id="__add__">
      <div class="tile">+</div>
      <div class="label">新建</div>
    </div>`;

  els.appGrid.innerHTML = cells + addCell;
  els.appGrid.classList.toggle('editing', state.editing);

  // Dock
  const pinned = state.apps.filter(a => a.pinned).slice(0, 4);
  els.dock.innerHTML = pinned.map(a => `
    <div class="app-cell" data-id="${a.id}">
      <div class="tile" style="background:${colorTileCss(a.color)}">${tileInner(a)}</div>
    </div>
  `).join('');
}

function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

/* ---------- View switching ---------- */
function showView(name) {
  state.currentView = name;
  els.viewHome.classList.toggle('active', name === 'home');
  els.viewWebview.classList.toggle('active', name === 'webview');
}

/* ---------- Open webview for app ---------- */
function openWebview(appId) {
  const app = state.apps.find(a => a.id === appId);
  if (!app) return;
  state.currentAppId = appId;
  state.history = [app.url];
  state.historyIdx = 0;
  loadInFrame(app.url);
  els.wwUrl.textContent = getDomain(app.url);
  updateNavButtons();
  showView('webview');
}

function loadInFrame(url) {
  els.webviewBlocked.classList.remove('show');
  els.webviewLoading.classList.add('show');
  els.webviewFrame.src = url;

  // Many sites send X-Frame-Options / CSP frame-ancestors.
  // If the iframe fails to load (we can't directly detect cross-origin block),
  // we still show the URL bar; user can hit "open in new tab" via blocked card.
  // Heuristic: if onload hasn't fired within 3.5s, assume blocked → show fallback.
  clearTimeout(loadInFrame._t);
  loadInFrame._t = setTimeout(() => {
    // We can't read cross-origin frame content; just keep the loading bar visible.
    // If the site rendered, great; if blocked, the iframe will be blank.
    els.webviewLoading.classList.remove('show');
    // Detect blank/blocked by checking the iframe readyState is unreachable.
    // Always provide the "open in new tab" fallback via the share button.
  }, 3500);
}

function updateNavButtons() {
  els.wwBack.disabled = state.historyIdx <= 0;
  els.wwForward.disabled = state.historyIdx >= state.history.length - 1;
  els.toolBack.disabled = els.wwBack.disabled;
  els.toolForward.disabled = els.wwForward.disabled;
  els.switchBadge.textContent = state.apps.length;
}

/* ---------- History navigation (within app session) ---------- */
function goBack() {
  if (state.historyIdx > 0) {
    state.historyIdx--;
    const url = state.history[state.historyIdx];
    loadInFrame(url);
    els.wwUrl.textContent = getDomain(url);
    updateNavButtons();
  }
}
function goForward() {
  if (state.historyIdx < state.history.length - 1) {
    state.historyIdx++;
    const url = state.history[state.historyIdx];
    loadInFrame(url);
    els.wwUrl.textContent = getDomain(url);
    updateNavButtons();
  }
}

/* ---------- Sheets ---------- */
function openSheet(sheetEl) {
  els.sheetOverlay.classList.add('show');
  sheetEl.classList.add('show');
}
function closeSheets() {
  els.sheetOverlay.classList.remove('show');
  els.sheetAdd.classList.remove('show');
  els.sheetSwitcher.classList.remove('show');
  els.sheetContext.classList.remove('show');
  state.switcherOpen = false;
}

/* ---------- Add/Edit sheet ---------- */
function openAddSheet(existingApp) {
  state.editingApp = existingApp ? existingApp.id : null;
  state.selectedColor = existingApp ? existingApp.color : 2;
  state.selectedStyle = existingApp ? existingApp.style : 'favicon';

  els.sheetAddTitle.textContent = existingApp ? '编辑网页应用' : '新建网页应用';
  els.inputUrl.value = existingApp ? existingApp.url : '';
  els.inputName.value = existingApp ? existingApp.name : '';
  els.inputEmoji.value = existingApp ? (existingApp.emoji || '') : '';
  els.btnSaveApp.textContent = existingApp ? '保存' : '添加';
  els.fieldEmoji.classList.toggle('show', state.selectedStyle === 'emoji');

  // Style tabs
  [...els.styleTabs.children].forEach(b => {
    b.classList.toggle('active', b.dataset.style === state.selectedStyle);
  });

  // Color swatches
  els.colorSwatches.innerHTML = COLOR_TILES.map(c =>
    `<div class="swatch ${c.id === state.selectedColor ? 'selected' : ''}" data-color="${c.id}" style="background:${c.css}"></div>`
  ).join('');

  updateIconPreview();
  openSheet(els.sheetAdd);
  setTimeout(() => els.inputUrl.focus(), 320);
}

function updateIconPreview() {
  const url = els.inputUrl.value;
  const name = els.inputName.value || '新应用';
  const color = state.selectedColor;
  const style = state.selectedStyle;
  const emoji = els.inputEmoji.value || '🌐';

  els.iconPreview.style.background = colorTileCss(color);
  els.iconPreviewName.textContent = name;

  if (style === 'favicon' && url) {
    els.iconPreview.innerHTML = `<img src="${faviconUrl(url, 64)}" alt="" onerror="this.style.display='none'; this.parentNode.textContent='${getInitial(name)}';" />`;
  } else if (style === 'letter') {
    els.iconPreview.textContent = getInitial(name);
  } else {
    els.iconPreview.textContent = emoji;
  }
}

function saveAppFromSheet() {
  const url = normalizeUrl(els.inputUrl.value);
  const name = (els.inputName.value || '').trim() || getDomain(url) || '新应用';
  if (!url) { showToast('请输入网址'); return; }

  const data = {
    url,
    name,
    color: state.selectedColor,
    style: state.selectedStyle,
    emoji: els.inputEmoji.value || '🌐',
  };

  if (state.editingApp) {
    const idx = state.apps.findIndex(a => a.id === state.editingApp);
    if (idx >= 0) {
      state.apps[idx] = { ...state.apps[idx], ...data };
      saveApps();
      renderHome();
      closeSheets();
      showToast('已更新');
    }
  } else {
    const app = { id: uid(), ...data, addedAt: Date.now(), pinned: false };
    state.apps.push(app);
    saveApps();
    renderHome();
    closeSheets();
    showToast('已添加到主屏');
  }
}

/* ---------- Context sheet (long press) ---------- */
let longPressTimer = null;
let pressTarget = null;

function openContextSheet(appId) {
  const app = state.apps.find(a => a.id === appId);
  if (!app) return;
  els.ctxIcon.style.background = colorTileCss(app.color);
  if (app.style === 'favicon') {
    els.ctxIcon.innerHTML = `<img src="${faviconUrl(app.url, 64)}" alt="" onerror="this.style.display='none'; this.parentNode.textContent='${getInitial(app.name)}';" />`;
  } else if (app.style === 'letter') {
    els.ctxIcon.textContent = getInitial(app.name);
  } else {
    els.ctxIcon.textContent = app.emoji || '🌐';
  }
  els.ctxName.textContent = app.name;
  els.ctxUrl.textContent = getDomain(app.url);
  els.ctxPinLabel.textContent = app.pinned ? '从 Dock 移除' : '加入 Dock';
  els.sheetContext.dataset.appId = appId;
  openSheet(els.sheetContext);
}

/* ---------- Switcher sheet ---------- */
function openSwitcher() {
  state.switcherOpen = true;
  const items = state.apps.map(a => `
    <div class="switcher-item ${a.id === state.currentAppId ? 'active' : ''}" data-id="${a.id}">
      <div class="tile" style="background:${colorTileCss(a.color)}">${tileInner(a)}</div>
      <div class="label">${escapeHtml(a.name)}</div>
    </div>
  `).join('');
  const add = `
    <div class="switcher-item add" data-id="__add__">
      <div class="tile">+</div>
      <div class="label">新建</div>
    </div>`;
  els.switcherList.innerHTML = items + add;
  openSheet(els.sheetSwitcher);
}

/* ---------- Delete app ---------- */
function deleteApp(appId) {
  const idx = state.apps.findIndex(a => a.id === appId);
  if (idx < 0) return;
  state.apps.splice(idx, 1);
  saveApps();
  renderHome();
  closeSheets();
  showToast('已删除');
}

/* ---------- Toggle dock pin ---------- */
function togglePin(appId) {
  const app = state.apps.find(a => a.id === appId);
  if (!app) return;
  if (!app.pinned) {
    const pinnedCount = state.apps.filter(a => a.pinned).length;
    if (pinnedCount >= 4) {
      showToast('Dock 最多 4 个应用');
      return;
    }
  }
  app.pinned = !app.pinned;
  saveApps();
  renderHome();
  closeSheets();
  showToast(app.pinned ? '已加入 Dock' : '已从 Dock 移除');
}

/* ---------- Event delegation: home grid ---------- */
els.appGrid.addEventListener('click', (e) => {
  const del = e.target.closest('[data-delete]');
  if (del) {
    e.stopPropagation();
    deleteApp(del.dataset.delete);
    return;
  }
  const cell = e.target.closest('.app-cell');
  if (!cell) return;
  const id = cell.dataset.id;
  if (id === '__add__') {
    openAddSheet(null);
    return;
  }
  if (state.editing) {
    openContextSheet(id);
  } else {
    openWebview(id);
  }
});

els.dock.addEventListener('click', (e) => {
  const cell = e.target.closest('.app-cell');
  if (!cell) return;
  const id = cell.dataset.id;
  if (state.editing) openContextSheet(id);
  else openWebview(id);
});

/* Long-press to enter edit mode */
[els.appGrid, els.dock].forEach(container => {
  container.addEventListener('touchstart', (e) => {
    const cell = e.target.closest('.app-cell');
    if (!cell || cell.dataset.id === '__add__') return;
    pressTarget = cell;
    longPressTimer = setTimeout(() => {
      state.editing = true;
      renderHome();
      if (navigator.vibrate) navigator.vibrate(15);
    }, 600);
  });
  container.addEventListener('touchend', () => {
    clearTimeout(longPressTimer);
  });
  container.addEventListener('touchmove', () => {
    clearTimeout(longPressTimer);
  });
  // Mouse long-press for desktop preview
  container.addEventListener('mousedown', (e) => {
    const cell = e.target.closest('.app-cell');
    if (!cell || cell.dataset.id === '__add__') return;
    pressTarget = cell;
    longPressTimer = setTimeout(() => {
      state.editing = true;
      renderHome();
    }, 600);
  });
  container.addEventListener('mouseup', () => clearTimeout(longPressTimer));
  container.addEventListener('mouseleave', () => clearTimeout(longPressTimer));
});

/* "Done" button to exit edit mode = tap empty area on home */
els.viewHome.addEventListener('click', (e) => {
  if (state.editing && !e.target.closest('.app-cell')) {
    state.editing = false;
    renderHome();
  }
});

/* Search */
els.searchInput.addEventListener('input', () => renderHome());

/* ---------- Webview toolbar events ---------- */
els.wwBack.addEventListener('click', goBack);
els.wwForward.addEventListener('click', goForward);
els.toolBack.addEventListener('click', goBack);
els.toolForward.addEventListener('click', goForward);

els.wwReload.addEventListener('click', () => {
  if (state.history.length) loadInFrame(state.history[state.historyIdx]);
});
els.toolShare.addEventListener('click', shareCurrent);
els.wwShare.addEventListener('click', shareCurrent);

function shareCurrent() {
  const url = state.history[state.historyIdx] || '';
  if (url) {
    if (navigator.share) {
      navigator.share({ url }).catch(() => {});
    } else {
      // Open in new tab as fallback
      window.open(url, '_blank');
    }
  }
}

els.blockOpen.addEventListener('click', () => {
  const url = state.history[state.historyIdx];
  if (url) window.open(url, '_blank');
});

els.toolSwitch.addEventListener('click', openSwitcher);
els.toolHome.addEventListener('click', () => {
  showView('home');
  state.currentAppId = null;
  state.history = [];
  state.historyIdx = -1;
});

/* ---------- Add/Edit sheet events ---------- */
els.inputUrl.addEventListener('input', () => {
  // Auto-fill name from domain if name is empty or matches previous domain
  const domain = getDomain(els.inputUrl.value);
  if (domain && (!els.inputName.value || els.inputName.value === getInitialPrevDomain)) {
    els.inputName.value = domain;
  }
  getInitialPrevDomain = domain;
  updateIconPreview();
});
let getInitialPrevDomain = '';

els.inputName.addEventListener('input', updateIconPreview);
els.inputEmoji.addEventListener('input', updateIconPreview);

els.colorSwatches.addEventListener('click', (e) => {
  const sw = e.target.closest('.swatch');
  if (!sw) return;
  state.selectedColor = +sw.dataset.color;
  [...els.colorSwatches.children].forEach(c =>
    c.classList.toggle('selected', +c.dataset.color === state.selectedColor));
  updateIconPreview();
});

els.styleTabs.addEventListener('click', (e) => {
  const tab = e.target.closest('.style-tab');
  if (!tab) return;
  state.selectedStyle = tab.dataset.style;
  [...els.styleTabs.children].forEach(b =>
    b.classList.toggle('active', b.dataset.style === state.selectedStyle));
  els.fieldEmoji.classList.toggle('show', state.selectedStyle === 'emoji');
  updateIconPreview();
});

els.btnSaveApp.addEventListener('click', saveAppFromSheet);
els.btnCancelAdd.addEventListener('click', closeSheets);

/* ---------- Switcher sheet events ---------- */
els.btnCloseSwitcher.addEventListener('click', closeSheets);
els.btnNewFromSwitcher.addEventListener('click', () => {
  closeSheets();
  setTimeout(() => openAddSheet(null), 280);
});
els.switcherList.addEventListener('click', (e) => {
  const item = e.target.closest('.switcher-item');
  if (!item) return;
  const id = item.dataset.id;
  closeSheets();
  if (id === '__add__') {
    setTimeout(() => openAddSheet(null), 280);
  } else {
    setTimeout(() => openWebview(id), 280);
  }
});

/* ---------- Context sheet events ---------- */
els.ctxOpen.addEventListener('click', () => {
  const id = els.sheetContext.dataset.appId;
  closeSheets();
  state.editing = false;
  renderHome();
  setTimeout(() => openWebview(id), 280);
});
els.ctxEdit.addEventListener('click', () => {
  const id = els.sheetContext.dataset.appId;
  const app = state.apps.find(a => a.id === id);
  closeSheets();
  state.editing = false;
  renderHome();
  setTimeout(() => openAddSheet(app), 280);
});
els.ctxPin.addEventListener('click', () => {
  togglePin(els.sheetContext.dataset.appId);
});
els.ctxDelete.addEventListener('click', () => {
  deleteApp(els.sheetContext.dataset.appId);
});

/* ---------- Overlay click to dismiss ---------- */
els.sheetOverlay.addEventListener('click', () => {
  closeSheets();
  if (state.editing) {
    state.editing = false;
    renderHome();
  }
});

/* ---------- Status bar clock ---------- */
function updateClock() {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  els.statusTime.textContent = `${h}:${m}`;
}
setInterval(updateClock, 30000);

/* ---------- iframe load detection ---------- */
els.webviewFrame.addEventListener('load', () => {
  els.webviewLoading.classList.remove('show');
});

/* ---------- Boot ---------- */
function boot() {
  loadApps();
  updateClock();
  renderHome();
  updateNavButtons();
  showView('home');
}
boot();
