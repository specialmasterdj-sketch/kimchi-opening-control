// ============================================================
// Kimchi Mart Opening / Closing Control System
// 김치마트 오프닝 / 클로징 컨트롤 시스템 - 메인 로직
// ============================================================

const STORAGE_KEY = 'kmocs.state.v2';
const STORAGE_KEY_V1 = 'kmocs.state.v1';

let state = loadState();
let currentView = 'login';
let currentParams = {};
let _pendingByDept = {}; // precomputed once per render — avoids O(n³) in renderManualHub
let _assignChecklist = [];

// ===== STATE MGMT =====
function loadState() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const v1 = localStorage.getItem(STORAGE_KEY_V1);
      if (v1) raw = v1;
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      return migrate(parsed);
    }
  } catch (e) { console.warn('State load failed', e); }
  return defaultState();
}
function defaultState() {
  return {
    version: 6,
    user: null,
    staff: [],
    assignments: {},
    notices: [],
    freeReports: [],
    rewards: [],
    ownerEvaluations: [],
    storeManagers: {},
    settings: {
      store: KMOCS.STORES[0],
      activeShift: defaultShiftByTime(),
      lang: 'ko'
    }
  };
}
function migrate(s) {
  if (!s.version || s.version < 2) {
    s.version = 2;
    if (!s.notices) s.notices = [];
    if (!s.freeReports) s.freeReports = [];
    if (!s.settings) s.settings = {};
    if (!s.settings.activeShift) s.settings.activeShift = defaultShiftByTime();
    if (!s.settings.lang) s.settings.lang = 'ko';
    if (!s.settings.store) s.settings.store = KMOCS.STORES[0];
    if (s.assignments) {
      Object.values(s.assignments).forEach(list => {
        list.forEach(a => { if (!a.shift) a.shift = 'opening'; });
      });
    }
    if (!s.staff) s.staff = [];
  }
  if (s.version < 3) {
    s.version = 3;
    if (!s.rewards) s.rewards = [];
  }
  if (s.version < 4) {
    s.version = 4;
    if (!s.ownerEvaluations) s.ownerEvaluations = [];
  }
  if (s.version < 5) {
    s.version = 5;
    if (s.settings && !KMOCS.STORES.includes(s.settings.store)) {
      s.settings.store = KMOCS.STORES[0];
    }
  }
  if (s.version < 6) {
    s.version = 6;
    if (!s.storeManagers) s.storeManagers = {};
  }
  return s;
}
function defaultShiftByTime() {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins < 10 * 60 + 30) return 'opening';   // ~10:30 AM
  if (mins < 14 * 60 + 30) return 'midday';    // ~2:30 PM
  return 'closing';                             // 이후
}
// 시프트 데드라인이 지났는지 확인 (오늘 날짜 기준)
function isShiftLocked(date, shift) {
  if (date !== todayISO()) return date < todayISO(); // 과거 날짜는 잠김, 미래는 안 잠김
  const def = KMOCS.SHIFTS[shift];
  if (!def || def.deadlineHour === undefined) return false;
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const dlMins = def.deadlineHour * 60 + def.deadlineMin;
  return nowMins > dlMins;
}
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (window.KMOCS_FB && KMOCS_FB.isInitialized()) {
      KMOCS_FB.pushState(state);
    }
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      toast('저장 공간이 가득 찼습니다. 오래된 데이터를 정리하세요.', 'error');
    } else { console.error(e); }
  }
}

// Firestore에서 받은 remote state(사진은 __local_only__ 플레이스홀더)와
// local state의 사진(base64)을 병합. ID 매칭으로 사진 복원.
function mergeRemoteWithLocalPhotos(remote, local) {
  if (!remote) return local;
  const merged = JSON.parse(JSON.stringify(remote));
  if (!local) return merged;

  function restorePhoto(remoteVal, localVal) {
    if (remoteVal === '__local_only__' && typeof localVal === 'string' && localVal.startsWith('data:')) {
      return localVal;
    }
    return remoteVal;
  }

  // 1) assignments[date][].checklist[].photo + .messages[].photo
  if (merged.assignments && local.assignments) {
    Object.keys(merged.assignments).forEach(date => {
      const rTasks = merged.assignments[date] || [];
      const lTasks = (local.assignments && local.assignments[date]) || [];
      const lById = {};
      lTasks.forEach(t => { if (t && t.id) lById[t.id] = t; });
      rTasks.forEach(rt => {
        const lt = lById[rt.id];
        if (!lt) return;
        const litById = {};
        (lt.checklist || []).forEach(it => { if (it && it.id) litById[it.id] = it; });
        (rt.checklist || []).forEach(rit => {
          const lit = litById[rit.id];
          if (!lit) return;
          if (rit.photo) rit.photo = restorePhoto(rit.photo, lit.photo);
          if (Array.isArray(rit.messages) && Array.isArray(lit.messages)) {
            const lmById = {};
            lit.messages.forEach(m => { if (m && m.id) lmById[m.id] = m; });
            rit.messages.forEach(rm => {
              const lm = lmById[rm.id];
              if (lm && rm.photo) rm.photo = restorePhoto(rm.photo, lm.photo);
            });
          }
        });
      });
    });
  }

  // 2) notices[].photos[]
  function mergePhotosArray(rArr, lArr) {
    if (!Array.isArray(rArr) || !Array.isArray(lArr)) return;
    rArr.forEach((rp, i) => {
      if (rp === '__local_only__' && typeof lArr[i] === 'string') rArr[i] = lArr[i];
    });
  }
  if (Array.isArray(merged.notices) && Array.isArray(local.notices)) {
    const lById = {};
    local.notices.forEach(n => { if (n && n.id) lById[n.id] = n; });
    merged.notices.forEach(rn => {
      const ln = lById[rn.id];
      if (ln) mergePhotosArray(rn.photos, ln.photos);
    });
  }
  // 3) freeReports[].photos[]
  if (Array.isArray(merged.freeReports) && Array.isArray(local.freeReports)) {
    const lById = {};
    local.freeReports.forEach(r => { if (r && r.id) lById[r.id] = r; });
    merged.freeReports.forEach(rr => {
      const lr = lById[rr.id];
      if (lr) mergePhotosArray(rr.photos, lr.photos);
    });
  }

  return merged;
}

// ===== UTIL =====
function uid() { return Date.now().toString(36) + Math.random().toString(36).substring(2, 7); }
function fmtDateISO(d) {
  d = d || new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function todayISO() { return fmtDateISO(new Date()); }
function tomorrowISO() { const d = new Date(); d.setDate(d.getDate()+1); return fmtDateISO(d); }
function fmtDateKor(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return `${d.getMonth()+1}월 ${d.getDate()}일 (${'일월화수목금토'[d.getDay()]})`;
}
function fmtTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit' });
}
function fmtDateTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('ko-KR', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
}
function getDept(id) { return KMOCS.DEPARTMENTS.find(d => d.id === id); }
function getRole(id) { return KMOCS.ROLES.find(r => r.id === id); }
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function L(key) { return t(key, state.settings.lang); }
function activeShift() { return state.settings.activeShift || defaultShiftByTime(); }
function shiftDef(id) { return KMOCS.SHIFTS[id || activeShift()]; }
function dn(d) { return deptName(d, state.settings.lang); }
function ds(d) { return deptSub(d, state.settings.lang); }

// ===== ASSIGNMENT =====
function getAssignments(date) { return state.assignments[date] || []; }
function getAssignmentById(id) {
  for (const date in state.assignments) {
    const a = state.assignments[date].find(x => x.id === id);
    if (a) return a;
  }
  return null;
}
function getStoreTasks(date, shift) {
  return getAssignments(date)
    .filter(a => a.store === state.settings.store)
    .filter(a => !shift || (a.shift || 'opening') === shift);
}
function getMyTasks(date, shift) {
  if (!state.user) return [];
  return getStoreTasks(date, shift).filter(a => a.assignedTo && a.assignedTo.name === state.user.name);
}
function tasksByDept(date, deptId, shift) {
  return getStoreTasks(date, shift).filter(a => a.department === deptId);
}

function createAssignment(data) {
  const date = data.date || tomorrowISO();
  if (!state.assignments[date]) state.assignments[date] = [];
  const a = {
    id: uid(),
    store: state.settings.store,
    date,
    shift: data.shift || activeShift(),
    department: data.department,
    zone: data.zone || '',
    assignedBy: { name: state.user.name, role: state.user.role, roleName: getRole(state.user.role).name },
    assignedTo: { name: data.assignedToName },
    assignedAt: Date.now(),
    deadline: data.deadline || (data.shift === 'closing' ? '22:00' : '08:30'),
    photoRequired: data.photoRequired !== false,
    verifierName: data.verifierName || '',
    checklist: (data.checklistItems || []).map(text => ({
      id: uid(), text, completed: false, completedAt: null,
      hasIssue: false, issueNote: '', photos: []
    })),
    status: 'gray',
    employeeReceivedAt: null,
    startedAt: null,
    completedAt: null,
    verifiedAt: null,
    approvedAt: null,
    employeeNotes: '',
    verifierNotes: '',
    managerNotes: ''
  };
  state.assignments[date].push(a);
  saveState();
  return a;
}
function updateAssignment(id, updater) {
  for (const date in state.assignments) {
    const idx = state.assignments[date].findIndex(x => x.id === id);
    if (idx !== -1) {
      updater(state.assignments[date][idx]);
      recomputeStatus(state.assignments[date][idx]);
      saveState();
      return state.assignments[date][idx];
    }
  }
  return null;
}
function deleteAssignment(id) {
  for (const date in state.assignments) {
    const before = state.assignments[date].length;
    state.assignments[date] = state.assignments[date].filter(x => x.id !== id);
    if (state.assignments[date].length !== before) { saveState(); return true; }
  }
  return false;
}
function recomputeStatus(a) {
  if (a.approvedAt) { a.status = 'approved'; return; }
  if (a.verifiedAt) { a.status = 'verified'; return; }
  const items = a.checklist || [];
  const total = items.length;
  const done = items.filter(i => i.completed).length;
  const issues = items.some(i => i.hasIssue);
  if (issues) { a.status = 'red'; return; }
  if (total > 0 && done === total) { a.status = 'green'; return; }
  if (a.startedAt || done > 0) { a.status = 'yellow'; return; }
  a.status = 'gray';
}

// ===== STAFF =====
function addStaff(name, role) {
  if (!name) return;
  if (state.staff.some(s => s.name === name)) return;
  state.staff.push({ id: uid(), name, role: role || 'employee' });
  saveState();
}
function removeStaff(id) {
  state.staff = state.staff.filter(s => s.id !== id);
  saveState();
}

// ===== NOTICES =====
function addNotice(data) {
  const n = {
    id: uid(),
    kind: data.kind || 'store',
    title: data.title || '',
    body: data.body || '',
    target: data.target || state.settings.store,
    createdAt: Date.now(),
    createdBy: { name: state.user.name, role: state.user.role, roleName: getRole(state.user.role).name },
    pinned: !!data.pinned,
    photos: data.photos || []
  };
  state.notices.unshift(n);
  saveState();
  return n;
}
function getVisibleNotices() {
  return state.notices.filter(n => n.kind === 'all' || n.kind === 'urgent' || n.target === state.settings.store)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.kind === 'urgent' && b.kind !== 'urgent') return -1;
      if (b.kind === 'urgent' && a.kind !== 'urgent') return 1;
      return b.createdAt - a.createdAt;
    });
}
function deleteNotice(id) {
  state.notices = state.notices.filter(n => n.id !== id);
  saveState();
}
function togglePin(id) {
  const n = state.notices.find(x => x.id === id);
  if (n) { n.pinned = !n.pinned; saveState(); }
}

// ===== FREE REPORTS =====
function addFreeReport(data) {
  const r = {
    id: uid(),
    store: state.settings.store,
    kind: data.kind || 'other',
    title: data.title || '',
    body: data.body || '',
    photos: data.photos || [],
    createdAt: Date.now(),
    createdBy: { name: state.user.name, role: state.user.role },
    status: 'open',
    acknowledgedBy: null,
    acknowledgedAt: null,
    resolvedAt: null
  };
  state.freeReports.unshift(r);
  saveState();
  return r;
}
function getStoreReports() {
  return state.freeReports
    .filter(r => r.store === state.settings.store)
    .sort((a, b) => b.createdAt - a.createdAt);
}
function updateReport(id, updater) {
  const r = state.freeReports.find(x => x.id === id);
  if (!r) return;
  updater(r);
  saveState();
}
function deleteReport(id) {
  state.freeReports = state.freeReports.filter(r => r.id !== id);
  saveState();
}

// ===== PHOTO COMPRESSION =====
function compressImage(file, maxW = 1024, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    reader.onload = e => {
      const img = new Image();
      img.onerror = () => reject(new Error('이미지를 처리할 수 없습니다.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxW) { height = Math.round(height * maxW / width); width = maxW; }
        const cv = document.createElement('canvas');
        cv.width = width; cv.height = height;
        cv.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(cv.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ===== TOAST =====
function toast(msg, kind = '') {
  const host = document.getElementById('toast-host');
  if (!host) return;
  // 기존 토스트 모두 제거 (잔상 방지)
  while (host.firstChild) host.removeChild(host.firstChild);
  const el = document.createElement('div');
  el.className = 'toast ' + (kind || '');
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => {
    if (el.parentNode === host) host.removeChild(el);
  }, 1800);
}

// ===== LIGHTBOX =====
function openLightbox(src) {
  let host = document.getElementById('lightbox-host');
  if (!host) { host = document.createElement('div'); host.id='lightbox-host'; document.body.appendChild(host); }
  host.innerHTML = `
    <div class="lightbox" onclick="closeLightbox()">
      <button class="close" onclick="closeLightbox()">✕</button>
      <img src="${src}" alt="photo">
    </div>`;
}
function closeLightbox() {
  const host = document.getElementById('lightbox-host');
  if (host) host.innerHTML = '';
}

// ===== ROUTING =====
let _navStack = []; // 뒤로가기용 (앱 내부 + 브라우저 ←)
let _suppressPush = false;
const HOME_VIEWS = ['manager-dashboard','supervisor-dashboard','employee-dashboard','owner-overview','login'];
function goBack() {
  if (_navStack.length > 1) {
    _navStack.pop();
    const prev = _navStack[_navStack.length - 1];
    currentView = prev.view;
    currentParams = prev.params || {};
    try { window.history.back(); } catch(e) {}
    render();
    window.scrollTo(0, 0);
  } else {
    location.href = 'https://specialmasterdj-sketch.github.io/kfood-guide/apps.html';
  }
}
function navigate(view, params = {}) {
  // 같은 화면 중복 push 방지
  const top = _navStack[_navStack.length - 1];
  if (!top || top.view !== view || JSON.stringify(top.params || {}) !== JSON.stringify(params || {})) {
    _navStack.push({ view, params: { ...params } });
  }
  currentView = view;
  currentParams = params;
  if (!_suppressPush) {
    try { window.history.pushState({ view, params }, '', '#' + view); } catch (e) {}
  }
  render();
  window.scrollTo(0, 0);
}
window.addEventListener('popstate', function(e) {
  // 브라우저 ← 뒤로 가기
  _suppressPush = true;
  if (_navStack.length > 1) {
    _navStack.pop();
    const prev = _navStack[_navStack.length - 1];
    currentView = prev.view;
    currentParams = prev.params || {};
    render();
    window.scrollTo(0, 0);
  } else if (e.state && e.state.view) {
    currentView = e.state.view;
    currentParams = e.state.params || {};
    render();
    window.scrollTo(0, 0);
  }
  _suppressPush = false;
});
function logout() {
  if (!confirm(L('btn_logout') + '?')) return;
  state.user = null;
  saveState();
  navigate('login');
}

// ===== SHIFT / LANG / STORE SWITCHERS =====
function setShift(s) {
  state.settings.activeShift = s;
  saveState();
  render();
}
function setLang(l) {
  state.settings.lang = l;
  saveState();
  render();
}
function setStore(store) {
  state.settings.store = store;
  saveState();
  render();
}
function setMyName(name) {
  state.settings.myName = (name || '').trim();
  saveState();
  // 직원 목록에 자동 추가
  if (state.settings.myName && !state.staff.some(s => s.name === state.settings.myName)) {
    state.staff.push({ id: uid(), name: state.settings.myName, role: 'employee' });
    saveState();
  }
  render();
}
let _myOnlyFilter = false;
function toggleMyOnly() {
  _myOnlyFilter = !_myOnlyFilter;
  render();
}

// ===== PRECOMPUTE PENDING COUNTS =====
function computePendingByDept() {
  const date = todayISO();
  const store = state.settings.store;
  const sh = activeShift();
  _pendingByDept = {};
  (state.assignments[date] || []).forEach(t => {
    if (t.store !== store || t.shift !== sh) return;
    (t.checklist || []).forEach(it => {
      if (!it.completedAt) _pendingByDept[t.department] = (_pendingByDept[t.department] || 0) + 1;
    });
  });
}

// ===== RENDER =====
function render() {
  computePendingByDept();
  renderHeader();
  const main = document.getElementById('app-main');
  let body = '';
  if (currentView === 'login') {
    body = viewLogin();
  } else {
    body = renderTopNav() + renderShiftToggle() + renderViewBody();
  }
  main.innerHTML = body;
  main.classList.remove('km-entering');
  void main.offsetWidth;
  main.classList.add('km-entering');
  renderBottomNav();
}
function renderViewBody() {
  switch (currentView) {
    case 'manager-dashboard':    return viewManagerDashboard();
    case 'supervisor-dashboard': return viewSupervisorDashboard();
    case 'employee-dashboard':   return viewEmployeeDashboard();
    case 'task-detail':          return viewTaskDetail(currentParams.id);
    case 'assign':               return viewAssign();
    case 'verify-list':          return viewVerifyList();
    case 'verify-task':          return viewVerifyTask(currentParams.id);
    case 'dept-detail':          return viewDeptDetail(currentParams.deptId);
    case 'manual-group':         return viewManualGroup(currentParams.groupId);
    case 'manager-report':       return viewManagerReport();
    case 'achievement-snapshot': return viewAchievementSnapshot();
    case 'owner-overview':       return viewOwnerOverview();
    case 'dept-awards':          return viewDeptAwards(currentParams.month);
    case 'eom':                  return viewEOM(currentParams.month);
    case 'awards':               return viewAwards();
    case 'final-approval':       return viewFinalApproval();
    case 'report':               return viewReport();
    case 'report-dept':          return viewReportDept(currentParams.deptId);
    case 'group-grid':           return viewGroupGrid();
    case 'group-board':          return viewGroupBoard(currentParams.groupId, currentParams.mode || 'subdept');
    case 'staff':                return viewStaff();
    case 'settings':             return viewSettings();
    case 'notices':              return viewNotices();
    case 'notices-new':          return viewNoticeNew();
    case 'freerep':              return viewFreeReport();
    case 'freerep-new':          return viewFreeReportNew();
    default: return '<div class="empty"><div class="ico">❓</div><p>알 수 없는 화면</p></div>';
  }
}

function renderHeader() {
  const hdr = document.getElementById('app-header');
  if (!state.user) {
    hdr.classList.remove('with-controls');
    hdr.innerHTML = `
      <div class="title-row">
        <h1>${escapeHtml(L('app_title'))}</h1>
        <span class="subtitle">${escapeHtml(L('app_subtitle'))}</span>
      </div>
      ${langSwitcherHtml()}
    `;
    return;
  }
  const role = getRole(state.user.role);
  hdr.classList.add('with-controls');
  const myName = state.settings.myName || '';
  const lang = state.settings.lang || 'ko';
  const myPh = lang==='ko'?'👤 내 이름 (예: 김철수)'
              :lang==='es'?'👤 Tu nombre (ej: Juan)'
              :'👤 Your name (e.g., John)';
  const myTitle = lang==='ko'?'근무자 본인 이름 — 입력 시 「내 것만」 보기 가능, 체크 기록에 이름 남음'
                 :lang==='es'?'Tu nombre — habilita "Solo míos" y registra tu nombre'
                 :'Your name — enables "Mine only" and records your name on checks';
  // 사용자 정체성 pill — 이름 있으면 명확히, 없으면 빨강 깜빡 강조
  const userPillHtml = myName
    ? `<button class="user-pill set" onclick="openNameModal()" title="${
        lang==='ko'?'이름 변경':lang==='es'?'Cambiar nombre':'Change name'
      }">
        <span class="ico">👤</span>
        <span class="name">${escapeHtml(myName)}</span>
        <span class="caret">▾</span>
      </button>`
    : `<button class="user-pill empty" onclick="openNameModal()">
        <span class="ico">⚠️</span>
        <span class="name">${
          lang==='ko'?'이름 입력 필요':lang==='es'?'Ingresa tu nombre':'Enter your name'
        }</span>
      </button>`;
  const isHome = HOME_VIEWS.includes(currentView);
  const backHtml = isHome
    ? `<a href="https://specialmasterdj-sketch.github.io/kfood-guide/apps.html" class="hdr-back" title="All Apps">←</a>`
    : `<button class="hdr-back" onclick="goBack()" title="Back">←</button>`;
  hdr.innerHTML = `
    <div class="top-row">
      ${backHtml}
      <div class="title-row">
        <h1 class="app-title-h1">${escapeHtml(L('app_title'))}</h1>
        <span class="subtitle">${fmtDateKor(todayISO())}</span>
      </div>
      <div class="meta">
        ${userPillHtml}
      </div>
    </div>
    <div class="control-row">
      <select class="store-select" onchange="setStore(this.value)">
        ${KMOCS.STORES.map(s => `<option ${s===state.settings.store?'selected':''}>${escapeHtml(s)}</option>`).join('')}
      </select>
      ${langSwitcherHtml()}
    </div>
  `;
}

// ===== 이름 입력 모달 =====
// Maps the human store names used in this app to the Firebase branch IDs used
// by the kimchi-mart-order RTDB (schedules/{branch}/employees).
const STORE_TO_BRANCH = {
  'Miami':            'MIAMI',
  'Pembroke Pines':   'PEMBROKE_PINES',
  'Hollywood':        'HOLLYWOOD',
  'Coral Springs':    'CORAL_SPRINGS',
  'Las Olas':         'LASOLAS',
  'West Palm Beach':  'WEST_PALM',
};
async function loadScheduleEmployees(store){
  const branch = STORE_TO_BRANCH[store];
  if (!branch) return [];
  try {
    const r = await fetch(`https://kimchi-mart-order-default-rtdb.firebaseio.com/schedules/${branch}.json`);
    const data = await r.json();
    if (!data || !Array.isArray(data.employees)) return [];
    return data.employees;
  } catch(e) { return []; }
}
function openNameModal() {
  const lang = state.settings.lang || 'ko';
  const cur = state.settings.myName || '';
  const isFirst = !cur;
  const labels = {
    title:    lang==='ko'?(isFirst?'환영합니다 — 본인 이름을 입력해주세요':'이름 변경'):lang==='es'?(isFirst?'Bienvenido — ingresa tu nombre':'Cambiar nombre'):(isFirst?'Welcome — please enter your name':'Change name'),
    desc:     lang==='ko'?'이 이름은 모든 지시·답변·체크 기록에 남습니다. 본인 지점을 고르고 스케줄에서 본인을 선택하세요.':lang==='es'?'Este nombre se registra en todas las acciones. Elige tu tienda y selecciona del horario.':'This name will be recorded on all actions. Pick your store and select yourself from the schedule.',
    ph:       lang==='ko'?'또는 직접 입력 (예: 김철수)':lang==='es'?'o escribe (ej: Juan Pérez)':'or type (e.g., John Smith)',
    pickPh:   lang==='ko'?'— 스케줄에서 선택 —':lang==='es'?'— Selecciona del horario —':'— Pick from schedule —',
    storeLbl: lang==='ko'?'지점':lang==='es'?'Tienda':'Store',
    save:     lang==='ko'?'저장':lang==='es'?'Guardar':'Save',
    cancel:   lang==='ko'?'취소':lang==='es'?'Cancelar':'Cancel',
    loading:  lang==='ko'?'스케줄 로드 중…':lang==='es'?'Cargando…':'Loading…'
  };
  const host = document.getElementById('modal-host');
  if (!host) return;
  const stores = (typeof KMOCS !== 'undefined' && Array.isArray(KMOCS.STORES)) ? KMOCS.STORES : ['Miami','Pembroke Pines','Hollywood','Coral Springs','Las Olas','West Palm Beach'];
  const curStore = state.settings.store || stores[0];
  const storeOptions = stores.map(s => `<option value="${escapeHtml(s)}"${s===curStore?' selected':''}>${escapeHtml(s)}</option>`).join('');
  host.innerHTML = `
    <div class="modal-backdrop" onclick="if(event.target===this){closeNameModal()}">
      <div class="modal-card welcome-modal">
        <h2>${escapeHtml(labels.title)}</h2>
        <p class="muted small mt-1 mb-2">${escapeHtml(labels.desc)}</p>
        <label class="muted small" style="display:block;margin-bottom:4px">📍 ${escapeHtml(labels.storeLbl)}</label>
        <select id="welcome-store-select" class="input" style="margin-bottom:0.6rem" onchange="onStoreChangeInModal(this.value)">
          ${storeOptions}
        </select>
        <select id="welcome-name-select" class="input" style="margin-bottom:0.5rem" onchange="onNameSelect(this)">
          <option value="">${escapeHtml(labels.loading)}</option>
        </select>
        <input id="welcome-name-input" class="input" placeholder="${labels.ph}" value="${escapeHtml(cur)}" autofocus>
        <div class="row" style="gap:0.5rem;margin-top:0.8rem;">
          <button class="btn btn-success" style="flex:1;" onclick="saveNameFromModal()">${escapeHtml(labels.save)}</button>
          ${isFirst?'':`<button class="btn" onclick="closeNameModal()">${escapeHtml(labels.cancel)}</button>`}
        </div>
      </div>
    </div>
  `;
  populateNameDropdown(curStore, cur, labels);
  setTimeout(() => {
    const input = document.getElementById('welcome-name-input');
    if (input) {
      input.focus();
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') saveNameFromModal();
      });
    }
  }, 50);
}
function onNameSelect(sel){
  const v = sel.value;
  if (!v) return;
  const input = document.getElementById('welcome-name-input');
  if (input) input.value = v;
}
function onStoreChangeInModal(store){
  const lang = state.settings.lang || 'ko';
  const labels = {
    pickPh:  lang==='ko'?'— 스케줄에서 선택 —':lang==='es'?'— Selecciona del horario —':'— Pick from schedule —',
    loading: lang==='ko'?'스케줄 로드 중…':lang==='es'?'Cargando…':'Loading…'
  };
  const sel = document.getElementById('welcome-name-select');
  if (sel) { sel.innerHTML = `<option value="">${escapeHtml(labels.loading)}</option>`; sel.disabled = false; }
  populateNameDropdown(store, '', labels);
}
function populateNameDropdown(store, cur, labels){
  loadScheduleEmployees(store).then(emps => {
    const sel = document.getElementById('welcome-name-select');
    if (!sel) return;
    if (!emps.length) {
      sel.innerHTML = `<option value="">${escapeHtml(labels.pickPh)}</option>`;
      sel.disabled = true;
      return;
    }
    const grouped = {};
    emps.forEach(e => {
      const role = (e.role || 'OTHER').toUpperCase();
      (grouped[role] = grouped[role] || []).push(e);
    });
    let html = `<option value="">${escapeHtml(labels.pickPh)}</option>`;
    Object.entries(grouped).forEach(([role, list]) => {
      html += `<optgroup label="${escapeHtml(role)}">`;
      list.forEach(e => {
        const isSel = e.name === cur ? ' selected' : '';
        html += `<option value="${escapeHtml(e.name)}"${isSel}>${escapeHtml(e.name)}</option>`;
      });
      html += `</optgroup>`;
    });
    sel.innerHTML = html;
    sel.disabled = false;
  });
}
function closeNameModal() {
  const host = document.getElementById('modal-host');
  if (host) host.innerHTML = '';
}
function saveNameFromModal() {
  const input = document.getElementById('welcome-name-input');
  const val = (input && input.value || '').trim();
  const lang = state.settings.lang || 'ko';
  if (!val) {
    toast(lang==='ko'?'이름을 입력해주세요':'Enter your name', 'error');
    return;
  }
  setMyName(val);
  closeNameModal();
  toast(lang==='ko'?`✅ ${val}님 환영합니다`:lang==='es'?`✅ ¡Bienvenido, ${val}!`:`✅ Welcome, ${val}!`, 'success');
}

function langSwitcherHtml() {
  return `
    <div class="lang-switcher">
      ${KMOCS.LANGS.map(l => `
        <button class="lang-btn ${state.settings.lang===l.id?'active':''}" onclick="setLang('${l.id}')">
          ${l.short}
        </button>
      `).join('')}
    </div>
  `;
}

function renderShiftToggle() {
  if (!state.user) return '';
  const today = todayISO();
  const cur = activeShift();
  const shifts = ['opening', 'midday', 'closing'];
  const lang = state.settings.lang || 'ko';
  const lockedLbl = lang==='ko'?'⏰ TIMEOUT':lang==='es'?'⏰ TIMEOUT':'⏰ TIMEOUT';
  const cards = shifts.map(s => {
    const def = KMOCS.SHIFTS[s];
    const cnt = getStoreTasks(today, s).length;
    const locked = isShiftLocked(today, s);
    return `
      <button class="shift-btn ${s} ${cur===s?'active':''} ${locked?'locked':''}" onclick="setShift('${s}')">
        <span class="ico">${def.icon}</span>
        <span class="lbl">${escapeHtml(L('shift_'+s))} ${cnt?`<span class="badge-count">${cnt}</span>`:''}</span>
        <span class="sub">${locked ? lockedLbl : escapeHtml(L('shift_'+s+'_d'))}</span>
      </button>
    `;
  }).join('');
  return `<div class="shift-toggle three">${cards}</div>`;
}

function renderBottomNav() {
  // 하단 네비 폐지 — 상단 네비로 통합 (renderTopNav)
  const nav = document.getElementById('bottom-nav');
  if (nav) { nav.classList.add('hidden'); nav.innerHTML=''; }
}
function renderTopNav() {
  if (!state.user) return '';
  const role = getRole(state.user.role);
  const lang = state.settings.lang || 'ko';
  const home = role.canApprove ? 'manager-dashboard' : (role.canAssign ? 'supervisor-dashboard' : 'employee-dashboard');
  const items = [
    { v: home,             icn: '🏠', lbl: lang==='ko'?'메인':lang==='es'?'Inicio':'Home' },
    { v: 'notices',        icn: '📢', lbl: lang==='ko'?'공지':lang==='es'?'Avisos':'Notices' },
    { v: 'owner-overview', icn: '📊', lbl: lang==='ko'?'보고':lang==='es'?'Informe':'Report' },
    { v: 'awards',         icn: '🏆', lbl: lang==='ko'?'어워드':lang==='es'?'Premios':'Award' }
  ];
  return `<nav class="top-nav">${items.map(it => `
    <button class="${currentView === it.v || (it.v === 'owner-overview' && ['dept-awards','eom'].includes(currentView)) ? 'active' : ''}" onclick="navigate('${it.v}')">
      <span class="icn">${it.icn}</span>
      <span class="lbl">${escapeHtml(it.lbl)}</span>
    </button>
  `).join('')}</nav>`;
}

// ===== VIEWS =====

// --- LOGIN ---
function viewLogin() {
  // 로그인 폐지 — 진입 즉시 default user 만들고 메인 리다이렉트.
  if (!state.user) {
    state.user = { name: '👤', role: 'owner' };
    if (!state.staff.some(s => s.name === '👤')) {
      state.staff.push({ id: uid(), name: '👤', role: 'owner' });
    }
    saveState();
  }
  setTimeout(() => navigate('manager-dashboard'), 0);
  return '<div class="empty"><div class="ico">⏳</div></div>';
}
function _viewLoginOriginal_unused() {
  return `
    <div class="login-wrap">
      <div class="logo">🥬</div>
      <div class="app-title">${escapeHtml(L('app_title'))}</div>
      <div class="app-sub">${escapeHtml(L('app_subtitle'))}</div>

      <div class="card">
        <div class="field">
          <label>${escapeHtml(L('login_store'))}</label>
          <select id="login-store" class="select">
            ${KMOCS.STORES.map(s => `<option ${s===state.settings.store?'selected':''}>${escapeHtml(s)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>${escapeHtml(L('login_name'))}</label>
          <input id="login-name" class="input" placeholder="${escapeHtml(L('login_name_ph'))}" autocomplete="off">
        </div>
        <div class="field">
          <label>${escapeHtml(L('login_role'))}</label>
          <div class="role-grid">
            ${KMOCS.ROLES.map(r => `
              <button type="button" class="role-btn" data-role="${r.id}" onclick="selectRole('${r.id}')">
                <span class="icn">${r.icon}</span>
                <span>${escapeHtml(L('role_'+r.id))}</span>
              </button>
            `).join('')}
          </div>
        </div>
        <button class="btn btn-primary btn-block btn-lg" onclick="doLogin()">${escapeHtml(L('login_start'))}</button>
      </div>

      <div class="card flat" style="background: #fff7ed; border-color: #fed7aa;">
        <div class="small muted">
          <b>${escapeHtml(L('login_principles'))}</b><br>
          • ${escapeHtml(L('login_p1'))}<br>
          • ${escapeHtml(L('login_p2'))}
        </div>
      </div>
    </div>
  `;
}
function selectRole(roleId) {
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('selected'));
  const btn = document.querySelector(`.role-btn[data-role="${roleId}"]`);
  if (btn) btn.classList.add('selected');
}
function doLogin() {
  const name = document.getElementById('login-name').value.trim();
  const store = document.getElementById('login-store').value;
  const sel = document.querySelector('.role-btn.selected');
  if (!name) { toast(L('login_name'), 'error'); return; }
  if (!sel)  { toast(L('login_role'), 'error'); return; }
  state.user = { name, role: sel.dataset.role };
  state.settings.store = store;
  if (!state.staff.some(s => s.name === name)) {
    state.staff.push({ id: uid(), name, role: sel.dataset.role });
  }
  saveState();
  const role = getRole(sel.dataset.role);
  if (role.canApprove)      navigate('manager-dashboard');
  else if (role.canAssign)  navigate('supervisor-dashboard');
  else                      navigate('employee-dashboard');
  toast(`${L('toast_welcome')} ${name}`, 'success');
}

// --- MANAGER DASHBOARD --- (단순화: hub + 공지만)
function viewManagerDashboard() {
  return `
    ${renderManualHub()}
    ${renderNoticesPreview()}
  `;
}

function renderNoticesPreview() {
  const visible = getVisibleNotices().slice(0, 2);
  if (visible.length === 0) return '';
  return `
    <div class="card flat notices-preview" role="button" tabindex="0" onclick="navigate('notices')" style="background:#fff7ed; border-color:#fed7aa; padding:0.6rem 0.85rem; cursor:pointer;">
      <div class="row between">
        <b style="font-size:0.85rem;">📢 ${escapeHtml(L('notices_title'))}</b>
        <span class="muted small">${visible.length}+ →</span>
      </div>
      ${visible.map(n => `<div class="small mt-1">${n.pinned?'📌 ':''}<b>${escapeHtml(n.title)}</b></div>`).join('')}
    </div>
  `;
}

// --- SUPERVISOR DASHBOARD ---
function viewSupervisorDashboard() {
  const today = todayISO();
  const sh = activeShift();
  const todayTasks = getStoreTasks(today, sh);
  const sd = shiftDef();
  const needsVerify = todayTasks.filter(t => (t.status==='green'||t.status==='red') && !t.verifiedAt);
  const inProgress = todayTasks.filter(t => t.status === 'yellow');
  const notStarted = todayTasks.filter(t => t.status === 'gray');

  return `
    ${renderManualHub()}

    ${renderNoticesPreview()}

    <div class="card">
      <div class="card-row">
        <div>
          <h3 style="margin-bottom:0.2rem;">📝 ${escapeHtml(L('nav_assign'))} (${escapeHtml(L('shift_'+sh))})</h3>
          <div class="small muted">${escapeHtml(L('cur_assigned'))}: ${todayTasks.length}</div>
        </div>
        <button class="btn btn-primary" onclick="navigate('assign')">＋</button>
      </div>
    </div>

    <div class="section-head"><h2>${escapeHtml(L('sec_needs_verify'))}</h2><span class="count">${needsVerify.length}</span></div>
    ${needsVerify.length === 0 ?
      `<div class="empty"><div class="ico">✅</div><p>${escapeHtml(L('common_no'))}</p></div>` :
      needsVerify.map(t => taskCardHtml(t, 'verify-task')).join('')}

    <div class="section-head"><h2>${escapeHtml(L('sec_in_progress'))}</h2><span class="count">${inProgress.length}</span></div>
    ${inProgress.length === 0 ? `<div class="muted small">${escapeHtml(L('common_no'))}</div>` :
      inProgress.map(t => taskCardHtml(t, 'verify-task')).join('')}

    <div class="section-head"><h2>${escapeHtml(L('sec_not_started'))}</h2><span class="count">${notStarted.length}</span></div>
    ${notStarted.length === 0 ? `<div class="muted small">${escapeHtml(L('common_all_started'))}</div>` :
      notStarted.map(t => taskCardHtml(t, 'verify-task')).join('')}

    <button class="fab" onclick="navigate('assign')">＋</button>
  `;
}

// --- EMPLOYEE DASHBOARD ---
function viewEmployeeDashboard() {
  const today = todayISO();
  const sh = activeShift();
  const myTasks = getMyTasks(today, sh);
  const sd = shiftDef();

  if (myTasks.length === 0) {
    return `
      ${renderManualHub()}
      ${renderNoticesPreview()}
      <div class="empty">
        <div class="ico">📭</div>
        <p>${escapeHtml(L('dash_no_tasks'))}</p>
      </div>
    `;
  }
  const sorted = [...myTasks].sort((a,b) => (a.deadline||'99:99').localeCompare(b.deadline||'99:99'));
  const all = sorted.length;
  const done = sorted.filter(t => ['green','verified','approved'].includes(t.status)).length;

  return `
    ${renderNoticesPreview()}

    <div class="card">
      <div class="card-row">
        <div>
          <div class="small muted">${escapeHtml(L('dash_progress'))}</div>
          <div style="font-size:1.4rem; font-weight:800;">${done} / ${all}</div>
        </div>
        <div style="font-size:2rem;">${done === all ? '🎉' : '💪'}</div>
      </div>
      <div class="progress" style="height:8px; background:#f3f4f6; border-radius:999px; overflow:hidden;">
        <div style="height:100%; width:${all? Math.round(done/all*100):0}%; background:${sh==='closing'?'#7c3aed':'#16a34a'};"></div>
      </div>
    </div>

    ${sorted.map(t => taskCardHtml(t, 'task-detail')).join('')}
  `;
}

// --- TASK CARD ---
function taskCardHtml(t, gotoView) {
  const d = getDept(t.department);
  const items = t.checklist || [];
  const total = items.length;
  const done = items.filter(i => i.completed).length;
  const photos = items.reduce((s,i) => s + (i.photos?.length||0), 0);
  const sh = t.shift || 'opening';
  return `
    <div class="task-card s-${t.status} shift-${sh}" onclick="navigate('${gotoView}',{id:'${t.id}'})">
      <div class="top-row">
        <div class="dept-line">
          <span class="icn">${d?.icon || '📌'}</span>
          <span>${escapeHtml(dn(d))} · ${escapeHtml(t.zone || L('td_zone_unassigned'))}</span>
        </div>
        <span class="pill pill-${t.status}">${escapeHtml(L('status_'+t.status))}</span>
      </div>
      <div class="meta-row">
        <span class="shift-pill ${sh}">${shiftDef(sh).icon} ${escapeHtml(L('shift_'+sh))}</span>
        <span>👤 <b>${escapeHtml(t.assignedTo.name)}</b></span>
        <span>⏰ <b>${escapeHtml(t.deadline)}</b></span>
        <span>✅ <b>${done}/${total}</b></span>
        ${photos > 0 ? `<span>📷 <b>${photos}</b></span>` : ''}
        ${t.photoRequired ? `<span style="color:#dc2626; font-weight:700;">${escapeHtml(L('td_photo_must'))}</span>` : ''}
      </div>
      <div class="meta-row small">
        <span>${escapeHtml(L('td_assigner'))}: <b>${escapeHtml(t.assignedBy.name)}</b></span>
        ${t.verifierName ? `<span>${escapeHtml(L('td_verifier'))}: <b>${escapeHtml(t.verifierName)}</b></span>` : ''}
      </div>
    </div>
  `;
}

// --- TASK DETAIL ---
function viewTaskDetail(id) {
  const t = getAssignmentById(id);
  if (!t) return '<div class="empty">업무를 찾을 수 없습니다.</div>';
  const d = getDept(t.department);
  const sh = t.shift || 'opening';
  const sd = shiftDef(sh);

  const wf = `
    <div class="workflow">
      <div class="step done"><span class="lbl">${escapeHtml(L('wf_step1'))}</span><span class="who">${escapeHtml(t.assignedBy.name)}</span></div>
      <div class="step ${t.employeeReceivedAt?'done':(t.status==='gray'?'active':'')}"><span class="lbl">${escapeHtml(L('wf_step2'))}</span><span class="who">${t.employeeReceivedAt?fmtTime(t.employeeReceivedAt):escapeHtml(L('status_gray'))}</span></div>
      <div class="step ${t.startedAt?'done':''} ${t.status==='yellow'?'active':''}"><span class="lbl">${escapeHtml(L('wf_step3'))}</span><span class="who">${t.startedAt?fmtTime(t.startedAt):'-'}</span></div>
      <div class="step ${t.completedAt?'done':''} ${t.status==='green'||t.status==='red'?'active':''}"><span class="lbl">${escapeHtml(L('wf_step4'))}</span><span class="who">${t.completedAt?fmtTime(t.completedAt):'-'}</span></div>
      <div class="step ${t.verifiedAt?'done':''}"><span class="lbl">${escapeHtml(L('wf_step5'))}</span><span class="who">${t.verifiedAt?fmtTime(t.verifiedAt):'-'}</span></div>
      <div class="step ${t.approvedAt?'done':''}"><span class="lbl">${escapeHtml(L('wf_step6'))}</span><span class="who">${t.approvedAt?fmtTime(t.approvedAt):'-'}</span></div>
    </div>
  `;

  const items = (t.checklist||[]).map((it, idx) => {
    const photos = (it.photos||[]).map((p, pi) => `
      <div class="photo-thumb">
        <img src="${p}" onclick="openLightbox('${p}')">
        ${canEditTask(t)?`<button class="remove" onclick="event.stopPropagation();removePhoto('${t.id}','${it.id}',${pi})">✕</button>`:''}
      </div>
    `).join('');
    const addBtn = canEditTask(t) ? `
      <label class="photo-add">
        <span class="ico">📷</span><span>${escapeHtml(L('td_add_photo'))}</span>
        <input type="file" accept="image/*" capture="environment" hidden onchange="addPhoto(event,'${t.id}','${it.id}')">
      </label>` : '';
    return `
      <div class="checklist-item ${it.completed?'completed':''} ${it.hasIssue?'has-issue':''}">
        <div class="row">
          <input type="checkbox" ${it.completed?'checked':''} ${canEditTask(t)?'':'disabled'}
            onchange="toggleChecklist('${t.id}','${it.id}',this.checked)">
          <div class="item-text">${idx+1}. ${escapeHtml(it.text)}</div>
          ${it.completed && it.completedAt ? `<span class="check-time" title="${fmtDateTime(it.completedAt)}">⏱ ${fmtTime(it.completedAt)}</span>` : ''}
        </div>
        ${canEditTask(t)?`
          <div class="actions">
            <button class="btn btn-sm ${it.hasIssue?'btn-danger':'btn-outline'}" onclick="toggleIssue('${t.id}','${it.id}')">
              ${escapeHtml(it.hasIssue?L('td_issue_unmark'):L('td_issue_mark'))}
            </button>
          </div>`:''}
        ${it.hasIssue && canEditTask(t)?`
          <input type="text" class="input issue-input" placeholder="${escapeHtml(L('td_issue_ph'))}"
            value="${escapeHtml(it.issueNote)}"
            onchange="updateIssueNote('${t.id}','${it.id}',this.value)">`:''}
        ${it.hasIssue && !canEditTask(t) && it.issueNote?`
          <div class="banner danger small mt-1" style="margin-bottom:0;">${escapeHtml(it.issueNote)}</div>`:''}
        ${(photos||addBtn)?`<div class="photo-grid">${photos}${addBtn}</div>`:''}
      </div>
    `;
  }).join('');

  const total = (t.checklist||[]).length;
  const done = (t.checklist||[]).filter(i => i.completed).length;
  const totalPhotos = (t.checklist||[]).reduce((s,i)=>s+(i.photos?.length||0),0);

  let actionBtns = '';
  const isOwner = state.user && t.assignedTo.name === state.user.name;
  if (isOwner && !t.completedAt) {
    if (!t.employeeReceivedAt) {
      actionBtns = `<button class="btn btn-primary btn-block btn-lg" onclick="receiveTask('${t.id}')">${escapeHtml(L('act_receive'))}</button>`;
    } else {
      const allDone = total > 0 && done === total;
      const hasIssues = (t.checklist||[]).some(i => i.hasIssue);
      const photoOk = !t.photoRequired || totalPhotos > 0;
      let warning = '';
      if (!allDone) warning = L('warn_check_all');
      else if (!photoOk) warning = L('warn_photo_must');
      actionBtns = `
        ${warning?`<div class="banner warn">${escapeHtml(warning)}</div>`:''}
        <button class="btn btn-success btn-block btn-lg" ${(allDone&&photoOk)?'':'disabled style="opacity:0.5"'}
          onclick="submitReport('${t.id}')">
          ${escapeHtml(hasIssues?L('act_submit_issues'):L('act_submit'))}
        </button>
      `;
    }
  }

  return `
    <button class="btn btn-sm" onclick="goBack()">← ${escapeHtml(L('btn_back'))}</button>
    <h2 class="mt-2">${d?.icon||'📌'} ${escapeHtml(dn(d))} · ${escapeHtml(t.zone||L('td_zone_unassigned'))}
      <span class="shift-pill ${sh}">${sd.icon} ${escapeHtml(L('shift_'+sh))}</span>
    </h2>
    <div class="muted small mb-1">${fmtDateKor(t.date)} · ${escapeHtml(state.settings.store)}</div>

    ${wf}

    <div class="card flat">
      <dl class="kv">
        <dt>${escapeHtml(L('td_assigner'))}</dt><dd>${escapeHtml(t.assignedBy.name)} (${escapeHtml(t.assignedBy.roleName||'')})</dd>
        <dt>${escapeHtml(L('td_receiver'))}</dt><dd>${escapeHtml(t.assignedTo.name)}</dd>
        <dt>${escapeHtml(L('td_deadline'))}</dt><dd>${escapeHtml(t.deadline)}</dd>
        <dt>${escapeHtml(L('td_verifier'))}</dt><dd>${escapeHtml(t.verifierName||'-')}</dd>
        <dt>${escapeHtml(L('td_photo_report'))}</dt><dd>${t.photoRequired?`<span class="pill pill-red">${escapeHtml(L('td_required'))}</span>`:escapeHtml(L('td_optional'))}</dd>
        <dt>${escapeHtml(L('td_status'))}</dt><dd><span class="pill pill-${t.status}">${escapeHtml(L('status_'+t.status))}</span></dd>
      </dl>
    </div>

    <div class="section-head"><h2>${escapeHtml(L('td_checklist'))}</h2><span class="count">${done}/${total}</span></div>
    ${items || `<div class="empty">${escapeHtml(L('td_checklist'))}: ${escapeHtml(L('common_no'))}</div>`}

    ${canEditTask(t)?`
      <div class="card mt-2">
        <h3>${escapeHtml(L('td_notes'))}</h3>
        <textarea class="textarea" placeholder="${escapeHtml(L('td_notes_ph'))}"
          onchange="updateField('${t.id}','employeeNotes',this.value)">${escapeHtml(t.employeeNotes||'')}</textarea>
      </div>`:
      (t.employeeNotes?`<div class="card flat"><h3>${escapeHtml(L('td_emp_notes'))}</h3><div>${escapeHtml(t.employeeNotes)}</div></div>`:'')}

    ${t.verifierNotes?`<div class="card flat"><h3>${escapeHtml(L('td_ver_notes'))}</h3><div>${escapeHtml(t.verifierNotes)}</div></div>`:''}
    ${t.managerNotes?`<div class="card flat"><h3>${escapeHtml(L('td_mgr_notes'))}</h3><div>${escapeHtml(t.managerNotes)}</div></div>`:''}

    <div class="mt-2">${actionBtns}</div>

    ${getRole(state.user.role).canAssign && !isOwner?`
      <div class="card mt-2">
        <button class="btn btn-outline btn-block" onclick="navigate('verify-task',{id:'${t.id}'})">${escapeHtml(L('nav_verify'))}</button>
        <button class="btn btn-danger btn-block mt-1 btn-sm" onclick="confirmDelete('${t.id}')">${escapeHtml(L('btn_delete'))}</button>
      </div>`:''}
  `;
}

function canEditTask(t) {
  if (!state.user) return false;
  return state.user.name === t.assignedTo.name && !t.verifiedAt && !t.approvedAt;
}

function receiveTask(id) {
  updateAssignment(id, t => {
    if (!t.employeeReceivedAt) t.employeeReceivedAt = Date.now();
    if (!t.startedAt) t.startedAt = Date.now();
  });
  toast(L('toast_received'), 'success');
  render();
}
function toggleChecklist(taskId, itemId, checked) {
  updateAssignment(taskId, t => {
    const it = t.checklist.find(x => x.id === itemId);
    if (!it) return;
    it.completed = checked;
    it.completedAt = checked ? Date.now() : null;
    if (checked && !t.startedAt) t.startedAt = Date.now();
    if (checked && !t.employeeReceivedAt) t.employeeReceivedAt = Date.now();
  });
  render();
}
function toggleIssue(taskId, itemId) {
  updateAssignment(taskId, t => {
    const it = t.checklist.find(x => x.id === itemId);
    if (!it) return;
    it.hasIssue = !it.hasIssue;
    if (!it.hasIssue) it.issueNote = '';
  });
  render();
}
function updateIssueNote(taskId, itemId, val) {
  updateAssignment(taskId, t => {
    const it = t.checklist.find(x => x.id === itemId);
    if (it) it.issueNote = val;
  });
}
async function addPhoto(event, taskId, itemId) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  try {
    const dataUrl = await compressImage(file, 1024, 0.7);
    updateAssignment(taskId, t => {
      const it = t.checklist.find(x => x.id === itemId);
      if (!it) return;
      it.photos = it.photos || [];
      it.photos.push(dataUrl);
      if (!t.startedAt) t.startedAt = Date.now();
    });
    toast(L('toast_photo_added'), 'success');
    render();
  } catch (e) { toast(L('toast_photo_fail') + ': ' + e.message, 'error'); }
}
function removePhoto(taskId, itemId, idx) {
  if (!confirm(L('confirm_photo_del'))) return;
  updateAssignment(taskId, t => {
    const it = t.checklist.find(x => x.id === itemId);
    if (it && it.photos) it.photos.splice(idx, 1);
  });
  render();
}
function updateField(taskId, field, val) {
  updateAssignment(taskId, t => { t[field] = val; });
}
function submitReport(taskId) {
  const t = getAssignmentById(taskId);
  if (!t) return;
  const total = t.checklist.length;
  const done = t.checklist.filter(i => i.completed).length;
  if (done < total) { toast(L('warn_check_all'), 'error'); return; }
  const photos = t.checklist.reduce((s,i)=>s+(i.photos?.length||0),0);
  if (t.photoRequired && photos === 0) { toast(L('warn_photo_must'), 'error'); return; }
  updateAssignment(taskId, t2 => {
    t2.completedAt = Date.now();
    if (!t2.startedAt) t2.startedAt = Date.now();
  });
  toast(L('toast_submitted'), 'success');
  navigate('employee-dashboard');
}
function goBack() {
  if (!state.user) { navigate('login'); return; }
  const role = getRole(state.user.role);
  if (role.canApprove)     navigate('manager-dashboard');
  else if (role.canAssign) navigate('supervisor-dashboard');
  else                     navigate('employee-dashboard');
}
function confirmDelete(id) {
  if (!confirm(L('confirm_delete'))) return;
  deleteAssignment(id);
  toast(L('toast_deleted'));
  goBack();
}

// --- ASSIGN ---
function viewAssign() {
  const role = getRole(state.user.role);
  if (!role.canAssign) {
    return '<div class="banner danger">업무 배정 권한이 없습니다.</div>';
  }
  const sh = activeShift();
  const sd = shiftDef(sh);
  const defaultDeadline = sh === 'closing' ? '22:00' : '08:30';

  return `
    <button class="btn btn-sm" onclick="goBack()">← ${escapeHtml(L('btn_back'))}</button>
    <h2 class="mt-2">📝 ${escapeHtml(L('nav_assign'))} <span class="shift-pill ${sh}">${sd.icon} ${escapeHtml(L('shift_'+sh))}</span></h2>
    <div class="muted small mb-2">${escapeHtml(L('shift_'+sh+'_d'))}</div>

    <div class="card">
      <div class="field">
        <label>${escapeHtml(L('assign_date'))}</label>
        <select id="a-date" class="select">
          <option value="${todayISO()}" selected>${fmtDateKor(todayISO())} ${escapeHtml(L('assign_today'))}</option>
          <option value="${tomorrowISO()}">${fmtDateKor(tomorrowISO())} ${escapeHtml(L('assign_tomorrow'))}</option>
        </select>
        <div class="hint">${escapeHtml(sh==='opening'?L('assign_hint_open'):L('assign_hint_close'))}</div>
      </div>

      <div class="field">
        <label>${escapeHtml(L('assign_dept'))}</label>
        <select id="a-dept" class="select" onchange="onDeptChange()">
          <option value="">${escapeHtml(L('assign_dept_pick'))}</option>
          ${KMOCS.DEPARTMENTS.map(d => `<option value="${d.id}">${d.icon} ${escapeHtml(dn(d))} (${escapeHtml(ds(d))})</option>`).join('')}
        </select>
      </div>

      <div class="field">
        <label>${escapeHtml(L('assign_zone'))}</label>
        <input id="a-zone" class="input" list="zone-options">
        <datalist id="zone-options"></datalist>
      </div>

      <div class="field">
        <label>${escapeHtml(L('assign_emp'))}</label>
        <input id="a-emp" class="input" list="emp-options" placeholder="${escapeHtml(L('assign_emp_ph'))}" autocomplete="off">
        <datalist id="emp-options">
          ${state.staff.map(s => `<option value="${escapeHtml(s.name)}">`).join('')}
        </datalist>
      </div>

      <div class="field">
        <label>${escapeHtml(L('assign_verifier'))}</label>
        <input id="a-verifier" class="input" list="ver-options" placeholder="${escapeHtml(L('assign_verifier_ph'))}" value="${escapeHtml(state.user.name)}">
        <datalist id="ver-options">
          ${state.staff.filter(s => ['supervisor','asst_supervisor','manager','asst_manager'].includes(s.role)).map(s => `<option value="${escapeHtml(s.name)}">`).join('')}
        </datalist>
      </div>

    </div>

    <div class="card">
      <h3>${escapeHtml(L('assign_checklist'))}</h3>
      <div class="muted small mb-1">${escapeHtml(L('assign_auto_fill'))}</div>
      <div id="a-checklist"></div>
      <div class="row mt-1">
        <input id="a-custom" class="input" placeholder="${escapeHtml(L('assign_custom'))}" style="flex:1">
        <button class="btn" onclick="addCustomItem()">+</button>
      </div>
    </div>

    <button class="btn btn-primary btn-block btn-lg" onclick="submitAssign()">${escapeHtml(L('act_assign'))}</button>
    <div class="spacer"></div>
  `;
}

function onDeptChange() {
  const id = document.getElementById('a-dept').value;
  const dept = getDept(id);
  const sh = activeShift();
  const lang = state.settings.lang;
  if (!dept) {
    renderChecklistItems([]);
    document.getElementById('zone-options').innerHTML = '';
    return;
  }
  const zones = getZonesByLang(id, lang);
  document.getElementById('zone-options').innerHTML = zones.map(z => `<option value="${escapeHtml(z)}">`).join('');
  const common = getCommonChecklist(sh);
  const extras = getDeptExtrasByLang(id, sh, lang);
  const commonGroupLabel = L(sh === 'closing' ? 'group_common_closing' : 'group_common_opening');
  const items = [
    ...common.map(c => ({
      text: (c[lang] || c.text || c.ko),
      group: commonGroupLabel,
      selected: false
    })),
    ...extras.map(txt => ({ text: txt, group: dn(dept), selected: false }))
  ];
  renderChecklistItems(items);
}

function renderChecklistItems(items) {
  _assignChecklist = items.map((it, i) => ({ ...it, id: 'ci' + i }));
  const host = document.getElementById('a-checklist');
  if (!host) return;
  if (_assignChecklist.length === 0) {
    host.innerHTML = '<div class="muted small">부문 선택 시 자동 채워집니다.</div>';
    return;
  }
  host.innerHTML = _assignChecklist.map(c => `
    <label class="checkbox-row ${c.selected?'checked':''}" data-cid="${c.id}">
      <input type="checkbox" ${c.selected?'checked':''} onchange="toggleAssignItem('${c.id}',this.checked)">
      <span class="label-text">
        <small style="color:#6b7280; font-size:0.7rem;">[${escapeHtml(c.group)}]</small><br>
        ${escapeHtml(c.text)}
      </span>
    </label>
  `).join('');
}
function toggleAssignItem(cid, checked) {
  const item = _assignChecklist.find(c => c.id === cid);
  if (item) item.selected = checked;
  const row = document.querySelector(`.checkbox-row[data-cid="${cid}"]`);
  if (row) row.classList.toggle('checked', checked);
}
function addCustomItem() {
  const inp = document.getElementById('a-custom');
  const txt = inp.value.trim();
  if (!txt) return;
  _assignChecklist.push({ id: 'ci_c' + uid(), text: txt, group: '직접추가', selected: true });
  inp.value = '';
  renderChecklistItems(_assignChecklist);
}
function submitAssign() {
  const date = document.getElementById('a-date').value;
  const dept = document.getElementById('a-dept').value;
  const zone = document.getElementById('a-zone').value.trim();
  const empName = document.getElementById('a-emp').value.trim();
  const verifier = document.getElementById('a-verifier').value.trim();
  // Deadline 입력 폐기 — 시간 기준은 이제 9AM/1PM/5PM 자동 스냅샷 (Step 3에서 도입)
  const deadline = '';
  // 사진은 항상 옵션 (필요시 1장만). photoRequired 항상 false.
  const photoRequired = false;
  const items = _assignChecklist.filter(c => c.selected).map(c => c.text);

  if (!dept) { toast('부문을 선택하세요', 'error'); return; }
  if (!zone) { toast('담당 구역을 입력하세요', 'error'); return; }
  if (!empName) { toast('담당 직원을 입력하세요', 'error'); return; }
  if (items.length === 0) { toast('체크리스트가 비어있습니다', 'error'); return; }

  if (!state.staff.some(s => s.name === empName)) state.staff.push({ id: uid(), name: empName, role: 'employee' });
  if (verifier && !state.staff.some(s => s.name === verifier)) state.staff.push({ id: uid(), name: verifier, role: 'supervisor' });

  createAssignment({
    date, shift: activeShift(),
    department: dept, zone,
    assignedToName: empName,
    verifierName: verifier,
    deadline, photoRequired,
    checklistItems: items
  });
  toast(`${empName}${L('toast_assigned')}`, 'success');
  goBack();
}

// --- VERIFY LIST ---
function viewVerifyList() {
  const today = todayISO();
  const sh = activeShift();
  const sd = shiftDef(sh);
  const tasks = getStoreTasks(today, sh);
  const queue = tasks.filter(t => (t.status==='green'||t.status==='red') && !t.verifiedAt);
  const inProgress = tasks.filter(t => t.status==='yellow');
  const done = tasks.filter(t => t.verifiedAt && !t.approvedAt);
  const approved = tasks.filter(t => t.approvedAt);
  return `
    <h2>${sd.icon} ✅ ${escapeHtml(L('nav_verify'))} <span class="shift-pill ${sh}">${escapeHtml(L('shift_'+sh))}</span></h2>
    <div class="muted small mb-2">${fmtDateKor(today)} · ${escapeHtml(state.settings.store)}</div>

    <div class="banner info small">${escapeHtml(L('info_verify_intro'))}</div>

    <div class="section-head"><h2>${escapeHtml(L('sec_needs_verify'))}</h2><span class="count">${queue.length}</span></div>
    ${queue.length === 0 ? `<div class="empty"><div class="ico">⏳</div><p>${escapeHtml(L('common_no'))}</p></div>` :
      queue.map(t => taskCardHtml(t, 'verify-task')).join('')}

    <div class="section-head"><h2>${escapeHtml(L('sec_in_progress'))}</h2><span class="count">${inProgress.length}</span></div>
    ${inProgress.length === 0 ? `<div class="muted small">${escapeHtml(L('common_no'))}</div>` :
      inProgress.map(t => taskCardHtml(t, 'verify-task')).join('')}

    <div class="section-head"><h2>${escapeHtml(L('sec_verified'))}</h2><span class="count">${done.length}</span></div>
    ${done.length === 0 ? `<div class="muted small">${escapeHtml(L('common_no'))}</div>` :
      done.map(t => taskCardHtml(t, 'verify-task')).join('')}

    <div class="section-head"><h2>${escapeHtml(L('sec_approved'))}</h2><span class="count">${approved.length}</span></div>
    ${approved.length === 0 ? `<div class="muted small">${escapeHtml(L('common_no'))}</div>` :
      approved.map(t => taskCardHtml(t, 'verify-task')).join('')}
  `;
}

// --- VERIFY TASK ---
function viewVerifyTask(id) {
  const t = getAssignmentById(id);
  if (!t) return '<div class="empty">업무를 찾을 수 없습니다.</div>';
  const d = getDept(t.department);
  const total = (t.checklist||[]).length;
  const done = (t.checklist||[]).filter(i => i.completed).length;
  const issues = (t.checklist||[]).filter(i => i.hasIssue);
  const allPhotos = (t.checklist||[]).flatMap(i => i.photos||[]);
  const role = getRole(state.user.role);
  const sh = t.shift || 'opening';
  return `
    <button class="btn btn-sm" onclick="goBack()">← ${escapeHtml(L('btn_back'))}</button>
    <h2 class="mt-2">${d?.icon||'📌'} ${escapeHtml(dn(d))} · ${escapeHtml(t.zone||'')}
      <span class="shift-pill ${sh}">${shiftDef(sh).icon} ${escapeHtml(L('shift_'+sh))}</span>
    </h2>
    <div class="muted small mb-2">${fmtDateKor(t.date)} · 마감 ${escapeHtml(t.deadline)}</div>

    <div class="card flat">
      <dl class="kv">
        <dt>${escapeHtml(L('td_assigner'))}</dt><dd>${escapeHtml(t.assignedBy.name)} (${escapeHtml(t.assignedBy.roleName||'')})</dd>
        <dt>${escapeHtml(L('td_receiver'))}</dt><dd>${escapeHtml(t.assignedTo.name)}</dd>
        <dt>${escapeHtml(L('td_received_at'))}</dt><dd>${fmtDateTime(t.employeeReceivedAt) || '-'}</dd>
        <dt>${escapeHtml(L('td_completed_at'))}</dt><dd>${fmtDateTime(t.completedAt) || '-'}</dd>
        <dt>${escapeHtml(L('td_status'))}</dt><dd><span class="pill pill-${t.status}">${escapeHtml(L('status_'+t.status))}</span></dd>
      </dl>
    </div>

    <div class="section-head"><h2>${escapeHtml(L('td_checklist'))}</h2><span class="count">${done}/${total}</span></div>
    ${(t.checklist||[]).map((it,idx) => `
      <div class="checklist-item ${it.completed?'completed':''} ${it.hasIssue?'has-issue':''}">
        <div class="row">
          <span style="font-size:1.2rem;">${it.completed?'✅':'⬜'}</span>
          <div class="item-text">${idx+1}. ${escapeHtml(it.text)}</div>
        </div>
        ${it.hasIssue?`<div class="banner danger small mt-1" style="margin-bottom:0;">⚠️ ${escapeHtml(it.issueNote||L('status_red'))}</div>`:''}
        ${(it.photos||[]).length > 0?`
          <div class="photo-grid">
            ${(it.photos||[]).map(p=>`<div class="photo-thumb"><img src="${p}" onclick="openLightbox('${p}')"></div>`).join('')}
          </div>`:''}
      </div>
    `).join('')}

    ${t.employeeNotes?`<div class="card flat mt-2"><h3>${escapeHtml(L('td_emp_notes'))}</h3><div>${escapeHtml(t.employeeNotes)}</div></div>`:''}

    ${allPhotos.length === 0 && t.photoRequired?`<div class="banner danger">${escapeHtml(L('warn_no_photos'))}</div>`:''}
    ${issues.length > 0?`<div class="banner warn">⚠️ ${issues.length}${escapeHtml(L('info_n_issues'))}</div>`:''}

    <div class="card mt-2">
      <h3>${escapeHtml(L('td_ver_notes'))}</h3>
      <textarea class="textarea" id="ver-notes">${escapeHtml(t.verifierNotes||'')}</textarea>
    </div>

    ${!t.verifiedAt && t.completedAt?`
      <div class="btn-group mt-2">
        <button class="btn btn-success btn-lg" onclick="verifyTask('${t.id}', true)">${escapeHtml(L('act_verify_ok'))}</button>
        <button class="btn btn-warn btn-lg" onclick="verifyTask('${t.id}', false)">${escapeHtml(L('act_verify_back'))}</button>
      </div>
    `:t.verifiedAt && !t.approvedAt && role.canApprove?`
      <button class="btn btn-primary btn-block btn-lg mt-2" onclick="approveTask('${t.id}')">${escapeHtml(L('act_mgr_approve'))}</button>
    `:t.approvedAt?`
      <div class="banner info">${escapeHtml(L('toast_approved'))} (${fmtDateTime(t.approvedAt)})</div>
    `:`<div class="banner warn">${escapeHtml(L('info_no_emp_report'))}</div>`}

    ${role.canAssign?`
      <div class="card mt-2">
        <button class="btn btn-danger btn-block btn-sm" onclick="confirmDelete('${t.id}')">${escapeHtml(L('btn_delete'))}</button>
      </div>`:''}
  `;
}
function verifyTask(id, approved) {
  const notes = document.getElementById('ver-notes')?.value || '';
  if (!approved) {
    if (!confirm(L('confirm_reassign'))) return;
    updateAssignment(id, t => {
      t.verifierNotes = notes;
      t.completedAt = null;
      t.startedAt = Date.now();
    });
    toast(L('toast_reassigned'), 'success');
  } else {
    updateAssignment(id, t => {
      t.verifierNotes = notes;
      t.verifiedAt = Date.now();
      t.verifierBy = state.user.name;
    });
    toast(L('toast_verified'), 'success');
  }
  navigate('verify-list');
}
function approveTask(id) {
  const notes = document.getElementById('ver-notes')?.value || '';
  updateAssignment(id, t => {
    t.managerNotes = notes;
    t.approvedAt = Date.now();
    t.approvedBy = state.user.name;
  });
  toast(L('toast_approved'), 'success');
  navigate('verify-list');
}

// --- DEPT DETAIL ---
// 그날 그 매장 그 부문의 단일 daily task 보장 (없으면 default 체크리스트로 자동 생성)
// base 항목 수가 KMOCS와 다르면 자동 재생성 (done 상태/사진 보존, extra 보존)
function ensureDailyDeptTask(date, store, deptId, shift) {
  const all = state.assignments[date] || (state.assignments[date] = []);
  let t = all.find(x => x.store === store && x.department === deptId && x.shift === shift && x.kind === 'daily');
  const lang = state.settings.lang || 'ko';
  const items = getDeptExtrasByLang(deptId, shift, lang);

  if (t) {
    const baseCount = (t.checklist || []).filter(it => !it.isExtra).length;
    if (baseCount !== items.length) {
      // 옛 base 항목들의 done/사진 상태를 idx 기반으로 보존
      const oldBase = {};
      (t.checklist || []).forEach(it => {
        if (!it.isExtra && it.id && it.id.startsWith('d')) {
          const idx = parseInt(it.id.slice(1), 10);
          oldBase[idx] = it;
        }
      });
      const extras = (t.checklist || []).filter(it => it.isExtra);
      t.checklist = items.map((text, i) => {
        const old = oldBase[i] || {};
        return {
          id: 'd' + i, text, isExtra: false,
          completed: !!old.completed,
          completedAt: old.completedAt || null,
          completedByName: old.completedByName || '',
          photos: old.photos || [],
          hasIssue: !!old.hasIssue,
          issueNote: old.issueNote || ''
        };
      }).concat(extras);
      saveState();
    }
    return t;
  }
  t = {
    id: uid(),
    kind: 'daily',
    date, shift, store,
    department: deptId,
    zone: '',
    assignedBy: { name: '시스템' },
    assignedTo: { name: '' },
    verifierName: '',
    photoRequired: false,
    deadline: '',
    status: 'gray',
    createdAt: Date.now(),
    checklist: items.map((text, i) => ({
      id: 'd' + i,
      text,
      isExtra: false,
      assignee: '',
      completed: false,
      completedAt: null,
      photos: [],
      hasIssue: false,
      issueNote: ''
    }))
  };
  all.push(t);
  saveState();
  return t;
}

// "지시 → 했습니다" 단순 모델 — 부문 1화면
function viewDeptDetail(deptId) {
  const dept = getDept(deptId);
  if (!dept) return '<div class="empty">부문 없음</div>';
  const sh = activeShift();
  const date = todayISO();
  const store = state.settings.store;
  const lang = state.settings.lang || 'ko';
  const isManager = state.user && getRole(state.user.role).canAssign;

  const t = ensureDailyDeptTask(date, store, deptId, sh);
  const myName = state.settings.myName || '';
  // default 항목은 매번 현재 lang으로 텍스트 재매핑 (옛 task id 형식 무관, 배열 인덱스 기반)
  const baseTextsNow = getDeptExtrasByLang(deptId, sh, lang);
  const baseItems = (t.checklist || []).filter(it => !it.isExtra).map((it, i) => {
    if (baseTextsNow[i]) return { ...it, text: baseTextsNow[i] };
    return it;
  });
  let extraItems = (t.checklist || []).filter(it => it.isExtra);
  // "내 것만" 필터 — 자기에게 온 노트만 (assignee match 또는 reply 참여)
  const myOnlyActive = _myOnlyFilter && !!myName;
  if (myOnlyActive) {
    extraItems = extraItems.filter(it =>
      (it.assignee && it.assignee === myName) ||
      (it.messages && it.messages.some(m => m.byName === myName))
    );
  }

  const lbl = {
    base:    lang==='ko'?'📋 공통 체크포인트 (매일)':'📋 Daily Checkpoints',
    extra:   lang==='ko'?'📝 스페셜 노트 (관리자 지시)':'📝 Special Notes (Manager)',
    done:    lang==='ko'?'✓ 했습니다':'✓ Done',
    photo:   lang==='ko'?'📷':'📷',
    add:     lang==='ko'?'+ 스페셜 노트 추가':'+ New special note',
    addPh:   lang==='ko'?'지시 내용 (예: 양상추 특별 진열)':'Note text',
    toName:  lang==='ko'?'담당 직원 (선택)':'Employee (optional)',
    submit:  lang==='ko'?'보내기':'Send',
    cancel:  lang==='ko'?'취소':'Cancel',
    none:    lang==='ko'?'아직 스페셜 노트 없음':'No special notes yet'
  };

  const renderItem = (it, idx) => {
    const done = !!it.completedAt;
    const time = done ? fmtTime(it.completedAt) : '';
    const who  = done && it.completedByName ? `· ${escapeHtml(it.completedByName)}` : '';

    // 공통 체크포인트 (단순 체크 + 시각)
    if (!it.isExtra) {
      return `
        <div class="order-row ${done?'done':''}">
          <span class="order-bullet">${done?'🟢':'⚪'}</span>
          <div class="order-body">
            <div class="order-text">${escapeHtml(it.text)}</div>
            ${done ? `<div class="order-meta">${time} ${who}</div>` : ''}
          </div>
          ${!done ? `
            <label class="order-photo-btn" title="${lbl.photo}">
              ${lbl.photo}
              <input type="file" accept="image/*" capture="environment" hidden onchange="addOrderPhoto(event,'${t.id}','${it.id}')">
            </label>
            <button class="order-done-btn" onclick="markOrderDone('${t.id}','${it.id}')">${lbl.done}</button>
          ` : (it.photos && it.photos.length ? `<span class="order-has-photo">📷</span>` : '')}
        </div>
      `;
    }

    // 스페셜 노트 — 채팅 스레드 형태
    const messages = (it.messages && it.messages.length)
      ? it.messages
      : [{ id: 'm0', by: 'order', byName: it.createdBy || '관리자', text: it.text, photo: null, ts: it.createdAt || Date.now() }];
    const msgsHtml = messages.map(m => {
      const cls = m.by === 'order' ? 'msg-order' : 'msg-reply';
      const photoHtml = m.photo ? `<img class="msg-photo" src="${m.photo}" alt="">` : '';
      const txt = m.text ? `<div class="msg-text">${escapeHtml(m.text)}</div>` : '';
      return `
        <div class="msg ${cls}">
          <div class="msg-head"><b>${escapeHtml(m.byName || '')}</b> <span class="muted small">${fmtTime(m.ts)}</span></div>
          ${txt}
          ${photoHtml}
        </div>
      `;
    }).join('');

    const finishLbl = state.settings.lang==='ko'?'✅ 완료 처리 (마무리)' : state.settings.lang==='es'?'✅ Marcar como completado' : '✅ Mark as Done';
    const replyArea = !done ? `
      <div class="reply-block">
        <div class="reply-area">
          <input id="reply-${it.id}" class="input" placeholder="${state.settings.lang==='ko'?'답변 입력...':'Reply...'}">
          <label class="order-photo-btn" title="${lbl.photo}">
            ${lbl.photo}
            <input type="file" accept="image/*" capture="environment" hidden onchange="replyToOrderPhoto(event,'${t.id}','${it.id}')">
          </label>
          <button class="reply-send-btn" onclick="replyToOrder('${t.id}','${it.id}')">${state.settings.lang==='ko'?'전송':'Send'}</button>
        </div>
        <button class="finish-order-btn" onclick="markOrderDone('${t.id}','${it.id}')">${finishLbl}</button>
      </div>
    ` : `<div class="finish-done-banner">✓ ${time} ${who}</div>`;

    const fromName = it.createdBy || '관리자';
    const toName = it.assignee || (state.settings.lang==='ko'?'전체':state.settings.lang==='es'?'todos':'all');
    const fromIco = '👨‍💼';
    const toIco = '🧑‍🔧';
    const arrowLbl = state.settings.lang==='ko'?'지시 → 수신':state.settings.lang==='es'?'asignó →':'assigned →';
    return `
      <div class="special-note ${done?'done':''}">
        <div class="note-head">
          <span class="order-bullet">${done?'🟢':'📝'}</span>
          <span class="note-title">${state.settings.lang==='ko'?'스페셜 노트':'Note'}</span>
        </div>
        <div class="note-attrib">
          <span class="attrib-from"><span class="aico">${fromIco}</span><span class="alabel">${escapeHtml(fromName)}</span></span>
          <span class="attrib-arrow">${escapeHtml(arrowLbl)}</span>
          <span class="attrib-to"><span class="aico">${toIco}</span><span class="alabel">${escapeHtml(toName)}</span></span>
          ${done && it.completedByName ? `<span class="attrib-done">✓ ${escapeHtml(it.completedByName)} · ${time}</span>` : ''}
        </div>
        <div class="msg-thread">${msgsHtml}</div>
        ${replyArea}
      </div>
    `;
  };

  const addPanel = isManager ? `
    <div class="card mt-2">
      <button class="btn btn-block btn-primary" onclick="toggleAddOrder()">${lbl.add}</button>
      <div id="add-order-panel" style="display:none;margin-top:0.6rem;">
        <input id="add-order-text" class="input" placeholder="${lbl.addPh}">
        <input id="add-order-to" class="input mt-1" list="emp-options" placeholder="${lbl.toName}">
        <datalist id="emp-options">
          ${state.staff.filter(s => s.role==='employee'||s.role==='supervisor'||s.role==='asst_supervisor').map(s=>`<option value="${escapeHtml(s.name)}">`).join('')}
        </datalist>
        <div class="row" style="gap:0.4rem;margin-top:0.5rem;">
          <button class="btn btn-success" style="flex:1;" onclick="submitAddOrder('${t.id}')">${lbl.submit}</button>
          <button class="btn" onclick="toggleAddOrder()">${lbl.cancel}</button>
        </div>
      </div>
    </div>
  ` : '';

  const totalItems = baseItems.length + extraItems.length;
  const doneItems = [...baseItems, ...extraItems].filter(i => i.completedAt).length;
  const allDone = totalItems > 0 && doneItems === totalItems;
  const finished = !!t.finishedAt;
  const finishLabels = {
    finished: lang==='ko'?'✅ 부문 보고 마무리됨':lang==='es'?'✅ Departamento finalizado':'✅ Department finished',
    submit:   lang==='ko'?`✅ 부문 보고 마무리 (${doneItems}/${totalItems})`:lang==='es'?`✅ Finalizar (${doneItems}/${totalItems})`:`✅ Submit (${doneItems}/${totalItems})`
  };
  // 항상 활성 — 미완료 시 클릭하면 confirm
  const finishBlock = finished
    ? `<div class="finish-dept-banner">${finishLabels.finished} · ${fmtDateTime(t.finishedAt)}${t.finishedByName?` · ${escapeHtml(t.finishedByName)}`:''}</div>`
    : `<button class="finish-dept-btn ${allDone?'ready':'partial'}" onclick="finishDept('${t.id}',${allDone})">${finishLabels.submit}</button>`;

  const locked = isShiftLocked(date, sh);
  const lockedBanner = locked ? `
    <div class="timeout-banner">
      ⏰ ${lang==='ko'?'TIMEOUT — 이 시프트의 데드라인이 지났습니다. 입력이 잠겼습니다.':lang==='es'?'TIMEOUT — Este turno está cerrado.':'TIMEOUT — Deadline passed. Input locked.'}
      <span class="muted small">(${shiftDef(sh).deadlineHour}:${String(shiftDef(sh).deadlineMin).padStart(2,'0')})</span>
    </div>
  ` : '';
  return `
    <button class="btn btn-sm" onclick="goBack()">← ${escapeHtml(L('btn_back'))}</button>
    <h2 class="mt-2">${dept.icon} ${escapeHtml(dn(dept))}</h2>
    <div class="muted small mb-2">${escapeHtml(store)} · ${fmtDateKor(date)} · ${shiftDef(sh).icon} ${escapeHtml(L('shift_'+sh))}</div>

    ${lockedBanner}

    <div class="card">
      <div class="row between" style="align-items:center;margin-bottom:0.5rem;">
        <h3 style="margin:0;">${lbl.extra} <span class="muted small">(${extraItems.filter(i=>i.completedAt).length}/${extraItems.length})</span></h3>
        ${myName ? `<label class="my-only-toggle ${myOnlyActive?'on':''}" onclick="toggleMyOnly()">${myOnlyActive?'✓ ':''}${lang==='ko'?'내 것만':lang==='es'?'Sólo míos':'Mine only'}</label>` : ''}
      </div>
      ${extraItems.length === 0 ? `<div class="muted small" style="padding:0.5rem 0;">${myOnlyActive ? (lang==='ko'?'나에게 온 노트가 없습니다':'No notes for you') : lbl.none}</div>` : extraItems.map(renderItem).join('')}
    </div>

    ${addPanel}

    <div class="card mt-2">
      <h3>${lbl.base} <span class="muted small">(${baseItems.filter(i=>i.completedAt).length}/${baseItems.length})</span></h3>
      ${baseItems.map(renderItem).join('')}
    </div>

    ${finishBlock}
  `;
}

function finishDept(taskId, allDone) {
  const t0 = Object.values(state.assignments || {}).flat().find(x => x.id === taskId);
  if (t0 && isShiftLocked(t0.date, t0.shift)) {
    toast(state.settings.lang==='ko'?'⏰ TIMEOUT':'⏰ TIMEOUT', 'error'); return;
  }
  if (!allDone) {
    const lang = state.settings.lang || 'ko';
    const msg = lang==='ko' ? '미완료 항목이 있습니다. 그대로 마무리할까요?' : 'Some items are incomplete. Submit anyway?';
    if (!confirm(msg)) return;
  }
  updateAssignment(taskId, t => {
    t.finishedAt = Date.now();
    t.finishedByName = state.settings.myName || state.user?.name || '';
  });
  toast(state.settings.lang==='ko'?'✅ 부문 보고 완료':'✅ Submitted', 'success');
  setTimeout(() => goBack(), 600);
}

function toggleAddOrder() {
  const p = document.getElementById('add-order-panel');
  if (p) p.style.display = (p.style.display === 'none' || !p.style.display) ? 'block' : 'none';
}

function submitAddOrder(taskId) {
  const text = (document.getElementById('add-order-text')||{}).value || '';
  const to = (document.getElementById('add-order-to')||{}).value || '';
  if (!text.trim()) { toast(state.settings.lang==='ko'?'지시 내용을 입력하세요':'Enter order text', 'error'); return; }
  // 지시자 이름은 myName 우선 (state.user.name은 '👤' 기본값일 수 있음)
  const issuer = (state.settings.myName || '').trim() || state.user?.name || '관리자';
  if (!state.settings.myName) {
    // 이름 없이 지시 못 함 — 입력 유도
    toast(state.settings.lang==='ko'?'⚠️ 먼저 우측 상단에 본인 이름을 입력해주세요':'⚠️ Enter your name first (top right)', 'error');
    return;
  }
  updateAssignment(taskId, t => {
    const id = 'x' + Date.now();
    t.checklist = t.checklist || [];
    t.checklist.push({
      id, text: text.trim(), isExtra: true, assignee: to.trim(),
      completed: false, completedAt: null, photos: [], hasIssue: false, issueNote: '',
      createdBy: issuer,
      createdAt: Date.now(),
      messages: [{
        id: 'm' + Date.now(),
        by: 'order',
        byName: issuer,
        text: text.trim(),
        photo: null,
        ts: Date.now()
      }]
    });
  });
  if (to.trim() && !state.staff.some(s => s.name === to.trim())) {
    state.staff.push({ id: uid(), name: to.trim(), role: 'employee' });
    saveState();
  }
  toast(state.settings.lang==='ko'?'✅ 지시 추가됨':'✅ Order added', 'success');
  render();
}

function replyToOrder(taskId, itemId) {
  const t0 = Object.values(state.assignments || {}).flat().find(x => x.id === taskId);
  if (t0 && isShiftLocked(t0.date, t0.shift)) {
    toast(state.settings.lang==='ko'?'⏰ TIMEOUT':'⏰ TIMEOUT', 'error'); return;
  }
  const inputEl = document.getElementById('reply-' + itemId);
  if (!inputEl) return;
  const text = (inputEl.value || '').trim();
  if (!text) { toast(state.settings.lang==='ko'?'답변을 입력하세요':'Enter reply', 'error'); return; }
  updateAssignment(taskId, t => {
    const it = (t.checklist||[]).find(x => x.id === itemId);
    if (!it) return;
    it.messages = it.messages || [];
    it.messages.push({
      id: 'm' + Date.now(),
      by: 'reply',
      byName: state.settings.myName || state.user?.name || '',
      text,
      photo: null,
      ts: Date.now()
    });
  });
  inputEl.value = '';
  render();
}

function replyToOrderPhoto(event, taskId, itemId) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    updateAssignment(taskId, t => {
      const it = (t.checklist||[]).find(x => x.id === itemId);
      if (!it) return;
      it.messages = it.messages || [];
      it.messages.push({
        id: 'm' + Date.now(),
        by: 'reply',
        byName: state.user?.name || '',
        text: '',
        photo: e.target.result,
        ts: Date.now()
      });
    });
    render();
  };
  reader.readAsDataURL(file);
}

function markOrderDone(taskId, itemId) {
  // 데드라인 체크
  const t0 = (state.assignments[todayISO()] || []).find(x => x.id === taskId)
          || Object.values(state.assignments || {}).flat().find(x => x.id === taskId);
  if (t0 && isShiftLocked(t0.date, t0.shift)) {
    toast(state.settings.lang==='ko'?'⏰ TIMEOUT — 입력이 잠겼습니다':'⏰ TIMEOUT — locked', 'error');
    return;
  }
  updateAssignment(taskId, t => {
    const it = (t.checklist||[]).find(x => x.id === itemId);
    if (!it || it.completedAt) return;
    it.completed = true;
    it.completedAt = Date.now();
    it.completedByName = state.settings.myName || state.user?.name || '';
    if (!t.startedAt) t.startedAt = Date.now();
  });
  toast('✓', 'success');
  render();
}

function addOrderPhoto(event, taskId, itemId) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    updateAssignment(taskId, t => {
      const it = (t.checklist||[]).find(x => x.id === itemId);
      if (!it) return;
      it.photos = [{ id: 'p' + Date.now(), data: e.target.result, ts: Date.now() }];
    });
    render();
  };
  reader.readAsDataURL(file);
}

// --- FINAL APPROVAL ---
function viewFinalApproval() {
  const date = todayISO();
  const sh = activeShift();
  const tasks = getStoreTasks(date, sh);
  const byDept = {};
  KMOCS.DEPARTMENTS.forEach(d => { byDept[d.id] = { dept: d, tasks: [] }; });
  tasks.forEach(t => { if (byDept[t.department]) byDept[t.department].tasks.push(t); });

  const rows = KMOCS.DEPARTMENTS.map(d => {
    const list = byDept[d.id].tasks;
    if (list.length === 0) return '';
    const total = list.length;
    const verified = list.filter(t => t.verifiedAt || t.approvedAt).length;
    const approved = list.filter(t => t.approvedAt).length;
    const issues = list.filter(t => t.status === 'red').length;
    const allApproved = approved === total;
    const status = issues > 0 ? 'red' : allApproved ? 'approved' : verified === total ? 'verified' : 'yellow';
    return `
      <div class="card">
        <div class="card-row">
          <div class="row">
            <span style="font-size:1.4rem;">${d.icon}</span>
            <div>
              <div style="font-weight:700;">${escapeHtml(dn(d))}</div>
              <div class="small muted">${escapeHtml(ds(d))}</div>
            </div>
          </div>
          <span class="pill pill-${status}">${escapeHtml(L('status_'+status))}</span>
        </div>
        <div class="meta-row" style="margin-top:0.4rem;">
          <span>${escapeHtml(L('report_total'))} <b>${total}</b></span>
          <span>${escapeHtml(L('report_verified'))} <b>${verified}</b></span>
          <span>${escapeHtml(L('report_approved'))} <b>${approved}</b></span>
          ${issues > 0?`<span style="color:#dc2626"><b>${escapeHtml(L('report_issues'))} ${issues}</b></span>`:''}
        </div>
        ${verified === total && !allApproved?`
          <button class="btn btn-primary btn-sm btn-block mt-1" onclick="bulkApprove('${d.id}')">${total}${escapeHtml(L('act_bulk_approve'))}</button>
        `:''}
      </div>
    `;
  }).filter(Boolean).join('');

  const allTasks = tasks.length;
  const allApproved = allTasks > 0 && tasks.every(t => t.approvedAt);
  const anyIssue = tasks.some(t => t.status === 'red');

  return `
    <h2>🔑 ${escapeHtml(L('nav_approve'))} <span class="shift-pill ${sh}">${shiftDef(sh).icon} ${escapeHtml(L('shift_'+sh))}</span></h2>
    <div class="muted small mb-2">${fmtDateKor(date)} · ${escapeHtml(state.settings.store)}</div>

    ${allTasks === 0?`<div class="empty"><div class="ico">📭</div><p>${escapeHtml(L('dash_no_tasks'))}</p></div>
    `:`
      <div class="banner ${allApproved?'info':anyIssue?'danger':'warn'}">
        ${escapeHtml(allApproved?(sh==='opening'?L('info_all_open'):L('info_all_close')):
          anyIssue?L('info_has_issues'):L('info_partial'))}
      </div>
      ${rows}
      <div class="card mt-2">
        <h3>${escapeHtml(L('td_mgr_notes'))}</h3>
        <textarea id="final-note" class="textarea"></textarea>
      </div>
      ${!allApproved?`
        <button class="btn btn-success btn-block btn-lg mt-2" onclick="approveAll()">
          ${escapeHtml(sh==='opening'?L('act_open_approve'):L('act_close_approve'))}
        </button>
      `:`<button class="btn btn-block btn-lg" disabled>${escapeHtml(L('sec_approved'))}</button>`}
    `}
  `;
}
function bulkApprove(deptId) {
  const date = todayISO();
  const sh = activeShift();
  const list = tasksByDept(date, deptId, sh).filter(t => t.verifiedAt && !t.approvedAt);
  list.forEach(t => updateAssignment(t.id, x => { x.approvedAt = Date.now(); x.approvedBy = state.user.name; }));
  toast(`${list.length}개 승인됨`, 'success');
  render();
}
function approveAll() {
  const date = todayISO();
  const sh = activeShift();
  const list = getStoreTasks(date, sh).filter(t => t.verifiedAt && !t.approvedAt);
  if (list.length === 0) { toast('승인 가능한 업무 없음', 'error'); return; }
  list.forEach(t => updateAssignment(t.id, x => { x.approvedAt = Date.now(); x.approvedBy = state.user.name; }));
  toast(`${list.length}개 일괄 승인`, 'success');
  render();
}

// --- EVALUATION HELPERS ---
function gradeFromScore(score) {
  if (score >= 90) return { id: 'a', key: 'eval_grade_a', color: '#16a34a', bg: '#dcfce7' };
  if (score >= 80) return { id: 'b', key: 'eval_grade_b', color: '#2563eb', bg: '#dbeafe' };
  if (score >= 70) return { id: 'c', key: 'eval_grade_c', color: '#d97706', bg: '#fef3c7' };
  if (score >= 60) return { id: 'd', key: 'eval_grade_d', color: '#ea580c', bg: '#fed7aa' };
  return { id: 'f', key: 'eval_grade_f', color: '#dc2626', bg: '#fee2e2' };
}
function evaluateTaskList(list) {
  if (!list || list.length === 0) return null;
  const total = list.length;
  const completed = list.filter(t => t.completedAt).length;
  const approved = list.filter(t => t.approvedAt).length;
  let totalItems = 0, doneItems = 0, requiredPhotos = 0, gotPhotos = 0, issues = 0, ontime = 0, hadDeadline = 0;
  list.forEach(t => {
    const items = t.checklist || [];
    totalItems += items.length;
    doneItems += items.filter(i => i.completed).length;
    issues += items.filter(i => i.hasIssue).length;
    if (t.photoRequired) {
      requiredPhotos += 1;
      const ph = items.reduce((s,i)=>s+(i.photos?.length||0),0);
      if (ph > 0) gotPhotos += 1;
    }
    if (t.deadline && t.completedAt) {
      hadDeadline += 1;
      const c = new Date(t.completedAt);
      const [hh, mm] = t.deadline.split(':').map(Number);
      const dl = new Date(c); dl.setHours(hh, mm, 0, 0);
      if (c <= dl) ontime += 1;
    }
  });
  const completionRate = total ? completed / total : 0;
  const photoRate = requiredPhotos ? gotPhotos / requiredPhotos : 1;
  const ontimeRate = hadDeadline ? ontime / hadDeadline : 1;
  const qualityRate = totalItems ? 1 - (issues / totalItems) : 1;
  // weights: completion 40, photo 25, timing 20, quality 15
  const score = Math.round(
    completionRate * 40 + photoRate * 25 + ontimeRate * 20 + qualityRate * 15
  );
  return {
    total, completed, approved, issues,
    completionRate, photoRate, ontimeRate, qualityRate,
    score: Math.max(0, Math.min(100, score)),
    grade: gradeFromScore(score)
  };
}
function evaluateEmployeeTasks(tasks, name) {
  const list = tasks.filter(t => t.assignedTo && t.assignedTo.name === name);
  return { name, evalData: evaluateTaskList(list), count: list.length };
}
function pct(n) { return Math.round((n||0) * 100) + '%'; }

// ===== 보상 산정 =====
const REWARD_TABLE = {
  a: { points: 50, cash: 5 },
  b: { points: 30, cash: 3 },
  c: { points: 15, cash: 1 },
  d: { points: 0,  cash: 0 },
  f: { points: 0,  cash: 0 }
};
// 보상 키: store|date|shift|employee
function rewardKey(store, date, shift, name) {
  return `${store}|${date}|${shift}|${name}`;
}
function getOrCreateReward(store, date, shift, name, score, gradeId) {
  const key = rewardKey(store, date, shift, name);
  let r = state.rewards.find(x => x.key === key);
  const tbl = REWARD_TABLE[gradeId] || REWARD_TABLE.f;
  if (!r) {
    r = {
      id: uid(),
      key,
      store, date, shift,
      employeeName: name,
      score, gradeId,
      points: tbl.points,
      cash: tbl.cash,
      paid: false,
      paidAt: null,
      paidBy: null
    };
    state.rewards.push(r);
  } else {
    // 점수가 갱신될 수 있으므로 미지급일 때는 재산정
    if (!r.paid) {
      r.score = score;
      r.gradeId = gradeId;
      r.points = tbl.points;
      r.cash = tbl.cash;
    }
  }
  return r;
}
function payReward(id) {
  const r = state.rewards.find(x => x.id === id);
  if (!r) return;
  r.paid = true;
  r.paidAt = Date.now();
  r.paidBy = state.user.name;
  saveState();
}
function unpayReward(id) {
  const r = state.rewards.find(x => x.id === id);
  if (!r) return;
  r.paid = false;
  r.paidAt = null;
  r.paidBy = null;
  saveState();
}
function payAllPending(date, shift) {
  const list = state.rewards.filter(r =>
    r.store === state.settings.store && r.date === date && r.shift === shift && !r.paid && r.points > 0
  );
  list.forEach(r => {
    r.paid = true;
    r.paidAt = Date.now();
    r.paidBy = state.user.name;
  });
  saveState();
  return list.length;
}

// ===== 오너 평가 =====
// key: date|store|groupId|managerName (한 매장 방문에 같은 관리자에 대한 평가 1건)
function ownerEvalKey(date, store, groupId, managerName) {
  return `${date}|${store}|${groupId}|${managerName}`;
}
function getOwnerEval(date, store, groupId, managerName) {
  const key = ownerEvalKey(date, store, groupId, managerName);
  return state.ownerEvaluations.find(e => e.key === key) || null;
}
function saveOwnerEval(date, store, groupId, managerName, consistency, detail, fulfillment, note) {
  const key = ownerEvalKey(date, store, groupId, managerName);
  let e = state.ownerEvaluations.find(x => x.key === key);
  const v = {
    consistency: clampScore(consistency),
    detail: clampScore(detail),
    fulfillment: clampScore(fulfillment),
    note: note || '',
    evaluatedAt: Date.now(),
    evaluatedBy: state.user.name
  };
  if (e) {
    Object.assign(e, v);
  } else {
    e = { id: uid(), key, date, store, groupId, managerName, ...v };
    state.ownerEvaluations.push(e);
  }
  saveState();
  return e;
}
function clampScore(n) {
  n = parseInt(n, 10);
  if (isNaN(n)) return 0;
  return Math.max(0, Math.min(10, n));
}
// 오너 점수 합계 (지점 X 그룹) — 그 그룹에 지시한 모든 관리자에 대한 (c+d+f) 평균. 30점 만점.
function ownerScoreForStoreGroup(date, store, groupId) {
  const list = state.ownerEvaluations.filter(e =>
    e.date === date && e.store === store && e.groupId === groupId
  );
  if (list.length === 0) return null;
  const sum = list.reduce((s,e) => s + e.consistency + e.detail + e.fulfillment, 0);
  return Math.round((sum / list.length) * 10) / 10; // 30점 만점, 소수 1자리
}
// 자동 점수: 매장의 그 그룹 task 평균 점수 (100점 만점)
function autoScoreForStoreGroup(date, shift, store, group) {
  // 모든 매장의 task에서 store 매칭 (cross-store)
  const allTasks = [];
  const dateMap = state.assignments[date] || [];
  dateMap.forEach(a => {
    if (a.shift !== shift) return;
    if (a.store !== store) return;
    if (group.members.includes(a.department)) allTasks.push(a);
  });
  const ev = evaluateTaskList(allTasks);
  return { ev, taskCount: allTasks.length };
}
// 종합 점수: 자동(60%) + 오너 환산(40%). 오너 30점 만점 → 100점 환산.
function combinedScore(autoScore, ownerScoreOutOf30) {
  const ownerPct = ownerScoreOutOf30 == null ? null : (ownerScoreOutOf30 / 30) * 100;
  if (ownerPct == null) return Math.round(autoScore);
  return Math.round(autoScore * 0.6 + ownerPct * 0.4);
}

// ===== 점장 등록/조회 =====
function getStoreManager(store) { return state.storeManagers[store] || ''; }
function setStoreManager(store, name) {
  state.storeManagers[store] = (name || '').trim();
  saveState();
}

// ===== 점장 / 관리자 평가 분리 점수 =====
// 점장 점수 (그 지점/그룹의 점장 1명에 대한 평가, 30점 만점)
function smScoreForStoreGroup(date, store, groupId) {
  const smName = getStoreManager(store);
  if (!smName) return null;
  const e = getOwnerEval(date, store, groupId, smName);
  if (!e) return null;
  return e.consistency + e.detail + e.fulfillment;
}
// 관리자 평균 점수 (점장 제외, 30점 만점)
function mgrAvgScoreForStoreGroup(date, store, groupId) {
  const smName = getStoreManager(store);
  const list = state.ownerEvaluations.filter(e =>
    e.date === date && e.store === store && e.groupId === groupId && e.managerName !== smName
  );
  if (list.length === 0) return null;
  const sum = list.reduce((s,e) => s + e.consistency + e.detail + e.fulfillment, 0);
  return Math.round((sum / list.length) * 10) / 10;
}
// 종합 점수 v2: 자동 50% + 점장 30% (30점→100환산) + 관리자평균 20%
function combinedScoreV2(autoScore, smScore, mgrAvgScore) {
  const smPct = smScore == null ? null : (smScore / 30) * 100;
  const mgrPct = mgrAvgScore == null ? null : (mgrAvgScore / 30) * 100;
  // 가중치: SM(30), Mgr(20), Auto(50). 결손 시 가중치 재배분.
  let total = autoScore * 0.5;
  let usedWeight = 0.5;
  if (smPct != null) { total += smPct * 0.3; usedWeight += 0.3; }
  if (mgrPct != null) { total += mgrPct * 0.2; usedWeight += 0.2; }
  // 평가 부재 시 자동만 100% 반영
  return Math.round(total / usedWeight);
}

// --- REPORT (부문 그리드 메인) ---
function viewReport() {
  const date = todayISO();
  const sh = activeShift();
  const tasks = getStoreTasks(date, sh);

  const overall = evaluateTaskList(tasks);
  const overallCard = overall ? `
    <button class="card" style="display:block; width:100%; text-align:left; cursor:pointer; border:2px solid ${overall.grade.color}; background:${overall.grade.bg};"
      onclick="navigate('report-dept',{deptId:'all'})">
      <div class="row between" style="align-items:flex-start;">
        <div>
          <div class="small muted">${escapeHtml(L('eval_overall'))}</div>
          <div style="font-size:2rem; font-weight:800; color:${overall.grade.color}; line-height:1;">
            ${overall.score}<span style="font-size:1rem; opacity:0.6;">/100</span>
          </div>
          <div style="font-weight:700; color:${overall.grade.color}; margin-top:0.25rem;">
            ${escapeHtml(L(overall.grade.key))}
          </div>
        </div>
        <div style="text-align:right;">
          <div class="small">${escapeHtml(L('eval_completion'))}: <b>${pct(overall.completionRate)}</b></div>
          <div class="small">${escapeHtml(L('eval_photo'))}: <b>${pct(overall.photoRate)}</b></div>
          <div class="small">${escapeHtml(L('eval_timing'))}: <b>${pct(overall.ontimeRate)}</b></div>
          <div class="small">${escapeHtml(L('eval_quality'))}: <b>${pct(overall.qualityRate)}</b></div>
        </div>
      </div>
      <div class="small mt-1" style="color:${overall.grade.color}; font-weight:600;">→ ${escapeHtml(L('rep_all_depts'))}</div>
    </button>
  ` : '';

  // 7개 핵심 평가 그룹
  const groupCards = KMOCS.DEPT_GROUPS.map(g => {
    const groupTasks = tasks.filter(t => g.members.includes(t.department));
    const memberDepts = g.members.map(id => getDept(id)).filter(Boolean);
    const memberLabel = memberDepts.map(d => dn(d)).join(' · ');
    if (groupTasks.length === 0) {
      return `
        <button class="group-card empty-group" disabled>
          <div class="header-row">
            <span class="icon-big">${g.icon}</span>
            <div class="title-block">
              <div class="group-title">${escapeHtml(L('group_'+g.id))}</div>
              <div class="group-members">${escapeHtml(memberLabel)}</div>
            </div>
            <div class="score-block">
              <div class="score-num" style="color:#9ca3af;">—</div>
              <div class="small muted">${escapeHtml(L('common_no'))}</div>
            </div>
          </div>
        </button>
      `;
    }
    const ev = evaluateTaskList(groupTasks);
    const workers = new Set(groupTasks.map(t => t.assignedTo?.name).filter(Boolean)).size;
    const issuesCnt = groupTasks.flatMap(t => (t.checklist||[]).filter(i => i.hasIssue)).length;
    return `
      <button class="group-card" style="border-color:${ev.grade.color}; background:${ev.grade.bg};"
        onclick="navigate('report-dept',{deptId:'group:${g.id}'})">
        <div class="accent" style="background:${ev.grade.color};"></div>
        <div class="header-row">
          <span class="icon-big">${g.icon}</span>
          <div class="title-block">
            <div class="group-title" style="color:${ev.grade.color};">${escapeHtml(L('group_'+g.id))}</div>
            <div class="group-members">${escapeHtml(memberLabel)}</div>
          </div>
          <div class="score-block">
            <div class="score-num" style="color:${ev.grade.color};">${ev.score}</div>
            <div class="score-grade" style="color:${ev.grade.color};">${escapeHtml(L(ev.grade.key))}</div>
          </div>
        </div>
        <div class="footer-row">
          <span>📋 <b>${groupTasks.length}</b> ${escapeHtml(L('rep_tasks_count'))}</span>
          <span>👥 <b>${workers}</b> ${escapeHtml(L('rep_workers_count'))}</span>
          <span>📷 ${pct(ev.photoRate)}</span>
          ${issuesCnt > 0 ? `<span style="color:#dc2626;">⚠ <b>${issuesCnt}</b></span>` : ''}
          <span class="arrow">→</span>
        </div>
      </button>
    `;
  }).join('');

  return `
    <div class="row between mb-1">
      <h2 style="margin:0">📊 ${escapeHtml(L('report_title'))} <span class="shift-pill ${sh}">${shiftDef(sh).icon} ${escapeHtml(L('shift_'+sh))}</span></h2>
      <button class="btn btn-sm no-print" onclick="window.print()">${escapeHtml(L('btn_print'))}</button>
    </div>
    <div class="muted small mb-2">${fmtDateKor(date)} · ${escapeHtml(state.settings.store)}</div>

    ${ tasks.length === 0
      ? `<div class="empty"><div class="ico">📭</div><p>${escapeHtml(L('dash_no_tasks'))}</p></div>`
      : `
        ${overallCard}
        <h3 class="mt-2">${escapeHtml(L('rep_grid_title'))}</h3>
        <div class="muted small mb-1">${escapeHtml(L('rep_grid_intro'))}</div>
        <div class="group-list">${groupCards}</div>
      ` }
  `;
}

// --- REPORT (부문 상세 = 4단계 체인) ---
function viewReportDept(deptId) {
  const date = todayISO();
  const sh = activeShift();
  const allTasks = getStoreTasks(date, sh);
  const isAll = deptId === 'all';
  const isGroup = typeof deptId === 'string' && deptId.startsWith('group:');
  const groupId = isGroup ? deptId.slice(6) : null;
  const group = isGroup ? KMOCS.DEPT_GROUPS.find(g => g.id === groupId) : null;
  const dept = (isAll || isGroup) ? null : getDept(deptId);

  let tasks, headerIcon, headerName, headerSub;
  if (isAll) {
    tasks = allTasks;
    headerIcon = '🌐';
    headerName = L('rep_all_depts');
    headerSub = '';
  } else if (isGroup) {
    if (!group) return '<div class="empty">부문 없음</div>';
    tasks = allTasks.filter(t => group.members.includes(t.department));
    headerIcon = group.icon;
    headerName = L('group_'+group.id);
    headerSub = group.members.map(id => dn(getDept(id))).join(' · ');
  } else {
    if (!dept) return '<div class="empty">부문 없음</div>';
    tasks = allTasks.filter(t => t.department === deptId);
    headerIcon = dept.icon;
    headerName = dn(dept);
    headerSub = ds(dept);
  }

  if (tasks.length === 0) {
    return `
      <button class="btn btn-sm" onclick="navigate('report')">${escapeHtml(L('rep_dept_back'))}</button>
      <h2 class="mt-2">${headerIcon} ${escapeHtml(headerName)}</h2>
      ${headerSub ? `<div class="muted small mb-2">${escapeHtml(headerSub)}</div>` : ''}
      <div class="empty"><div class="ico">📭</div><p>${escapeHtml(L('rep_dept_no_data'))}</p></div>
    `;
  }

  const byDept = {};
  KMOCS.DEPARTMENTS.forEach(d => { byDept[d.id] = []; });
  tasks.forEach(t => { if (byDept[t.department]) byDept[t.department].push(t); });

  const rows = KMOCS.DEPARTMENTS.map(d => {
    const list = byDept[d.id];
    if (list.length === 0) return '';
    const total = list.length;
    const approved = list.filter(t => t.approvedAt).length;
    const verified = list.filter(t => t.verifiedAt).length;
    const completed = list.filter(t => t.completedAt).length;
    const issues = list.flatMap(t => (t.checklist||[]).filter(i => i.hasIssue)).length;
    const photos = list.reduce((s,t) => s + (t.checklist||[]).reduce((s2,i) => s2 + (i.photos?.length||0), 0), 0);
    return `
      <tr>
        <td>${d.icon} ${escapeHtml(dn(d))}</td>
        <td>${total}</td><td>${completed}</td><td>${verified}</td><td>${approved}</td>
        <td style="color:${issues>0?'#dc2626':'#6b7280'}">${issues}</td>
        <td>${photos}</td>
      </tr>
    `;
  }).filter(Boolean).join('');

  // ===== 종합 평가 =====
  const overall = evaluateTaskList(tasks);
  const overallCard = overall ? `
    <div class="card" style="border:2px solid ${overall.grade.color}; background:${overall.grade.bg};">
      <div class="row between" style="align-items:flex-start;">
        <div>
          <div class="small muted">${escapeHtml(L('eval_overall'))}</div>
          <div style="font-size:2rem; font-weight:800; color:${overall.grade.color}; line-height:1;">
            ${overall.score}<span style="font-size:1rem; opacity:0.6;">/100</span>
          </div>
          <div style="font-weight:700; color:${overall.grade.color}; margin-top:0.25rem;">
            ${escapeHtml(L(overall.grade.key))}
          </div>
        </div>
        <div style="text-align:right;">
          <div class="small">${escapeHtml(L('eval_completion'))}: <b>${pct(overall.completionRate)}</b></div>
          <div class="small">${escapeHtml(L('eval_photo'))}: <b>${pct(overall.photoRate)}</b></div>
          <div class="small">${escapeHtml(L('eval_timing'))}: <b>${pct(overall.ontimeRate)}</b></div>
          <div class="small">${escapeHtml(L('eval_quality'))}: <b>${pct(overall.qualityRate)}</b></div>
        </div>
      </div>
    </div>
  ` : '';

  // ===== ① 관리자별 지시 현황 =====
  const assignerMap = {};
  tasks.forEach(t => {
    const name = t.assignedBy?.name || '-';
    if (!assignerMap[name]) assignerMap[name] = {
      name, role: t.assignedBy?.roleName || '', tasks: []
    };
    assignerMap[name].tasks.push(t);
  });
  const assignerRows = Object.values(assignerMap).map(a => {
    const total = a.tasks.length;
    const done = a.tasks.filter(t => t.completedAt).length;
    const pending = total - done;
    const workers = new Set(a.tasks.map(t => t.assignedTo?.name).filter(Boolean)).size;
    const depts = new Set(a.tasks.map(t => t.department)).size;
    return `
      <tr>
        <td>${escapeHtml(a.name)}</td>
        <td>${escapeHtml(a.role)}</td>
        <td>${total}</td>
        <td>${workers}</td>
        <td>${depts}</td>
        <td>${done}</td>
        <td style="color:${pending>0?'#92400e':'#6b7280'}">${pending}</td>
      </tr>
    `;
  }).join('');

  // ===== ② 직원별 이행 결과 =====
  const empNames = [...new Set(tasks.map(t => t.assignedTo?.name).filter(Boolean))];
  const empResults = empNames.map(name => {
    const ev = evaluateEmployeeTasks(tasks, name);
    return ev.evalData ? { name, e: ev.evalData } : null;
  }).filter(Boolean);
  // 점수 내림차순
  empResults.sort((a,b) => b.e.score - a.e.score);
  const empEvalRows = empResults.map(({name, e}) => `
    <tr>
      <td>${escapeHtml(name)}</td>
      <td>${e.total}</td>
      <td>${e.completed}</td>
      <td>${pct(e.photoRate)}</td>
      <td style="color:${e.issues>0?'#dc2626':'#6b7280'}">${e.issues}</td>
      <td style="font-weight:700; color:${e.grade.color}">${e.score}</td>
      <td><span class="pill" style="background:${e.grade.bg}; color:${e.grade.color}; border-color:${e.grade.color}">${escapeHtml(L(e.grade.key))}</span></td>
    </tr>
  `).join('');

  // ===== ③ 보상 산정 (자동 갱신) =====
  empResults.forEach(({name, e}) => {
    getOrCreateReward(state.settings.store, date, sh, name, e.score, e.grade.id);
  });
  saveState();
  const todayRewards = state.rewards.filter(r =>
    r.store === state.settings.store && r.date === date && r.shift === sh
  );
  const pendingRewards = todayRewards.filter(r => !r.paid);
  const paidRewards = todayRewards.filter(r => r.paid);
  const totalPoints = todayRewards.reduce((s,r)=>s+r.points, 0);
  const totalCash = todayRewards.reduce((s,r)=>s+r.cash, 0);
  const totalPaidCash = paidRewards.reduce((s,r)=>s+r.cash, 0);

  const rewardRow = (r, paidView) => {
    const grade = gradeFromScore(r.score);
    return `
      <tr>
        <td>${escapeHtml(r.employeeName)}</td>
        <td>${r.score}</td>
        <td><span class="pill" style="background:${grade.bg}; color:${grade.color}; border-color:${grade.color}">${escapeHtml(L(grade.key))}</span></td>
        <td>${r.points}</td>
        <td>$${r.cash}</td>
        ${paidView ? `
          <td>${fmtDateTime(r.paidAt)}</td>
          <td>${escapeHtml(r.paidBy||'-')}</td>
          <td><button class="btn btn-sm" onclick="doUnpayReward('${r.id}')">${escapeHtml(L('reward_btn_unpay'))}</button></td>
        ` : `
          <td>
            ${r.points > 0 ? `<button class="btn btn-sm btn-success" onclick="doPayReward('${r.id}')">${escapeHtml(L('reward_btn_pay'))}</button>` : `<span class="muted small">—</span>`}
          </td>
        `}
      </tr>
    `;
  };

  return `
    <button class="btn btn-sm" onclick="navigate('report')">${escapeHtml(L('rep_dept_back'))}</button>
    <div class="row between mb-1 mt-2">
      <h2 style="margin:0">${headerIcon} ${escapeHtml(headerName)} <span class="shift-pill ${sh}">${shiftDef(sh).icon} ${escapeHtml(L('shift_'+sh))}</span></h2>
      <button class="btn btn-sm no-print" onclick="window.print()">${escapeHtml(L('btn_print'))}</button>
    </div>
    <div class="muted small mb-2">${fmtDateKor(date)} · ${escapeHtml(state.settings.store)}${headerSub?` · ${escapeHtml(headerSub)}`:''}</div>

    ${overallCard}

    <div class="report-view">
      <h3>${escapeHtml(L('eval_status'))}</h3>
      <dl class="kv">
        <dt>${escapeHtml(L('report_date'))}</dt><dd>${fmtDateKor(date)}</dd>
        <dt>${escapeHtml(L('report_store'))}</dt><dd>${escapeHtml(state.settings.store)}</dd>
        <dt>${escapeHtml(L('report_shift'))}</dt><dd>${shiftDef(sh).icon} ${escapeHtml(L('shift_'+sh))}</dd>
        <dt>${escapeHtml(L('report_total'))}</dt><dd>${tasks.length}</dd>
        <dt>${escapeHtml(L('report_emp_done'))}</dt><dd>${tasks.filter(t=>t.completedAt).length}</dd>
        <dt>${escapeHtml(L('report_verified'))}</dt><dd>${tasks.filter(t=>t.verifiedAt).length}</dd>
        <dt>${escapeHtml(L('report_approved'))}</dt><dd>${tasks.filter(t=>t.approvedAt).length}</dd>
        <dt>${escapeHtml(L('report_issues'))}</dt><dd>${tasks.filter(t=>t.status==='red').length}</dd>
      </dl>

      <h3 class="mt-2">${escapeHtml(L('report_dept_status'))}</h3>
      ${rows?`<table>
        <thead><tr>
          <th>${escapeHtml(L('report_th_dept'))}</th>
          <th>${escapeHtml(L('report_th_total'))}</th>
          <th>${escapeHtml(L('report_th_done'))}</th>
          <th>${escapeHtml(L('report_th_verify'))}</th>
          <th>${escapeHtml(L('report_th_appr'))}</th>
          <th>${escapeHtml(L('report_th_iss'))}</th>
          <th>${escapeHtml(L('report_th_photo'))}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`:`<div class="muted small">${escapeHtml(L('report_no_data'))}</div>`}

      <h3 class="mt-2">${escapeHtml(L('report_issues_found'))}</h3>
      ${(() => {
        const allIssues = tasks.flatMap(t => (t.checklist||[]).filter(i => i.hasIssue).map(i => ({ t, i })));
        if (allIssues.length === 0) return `<div class="muted small">${escapeHtml(L('report_no_issues'))}</div>`;
        return `<table>
          <thead><tr><th>${escapeHtml(L('report_th_dept'))}</th><th>${escapeHtml(L('td_zone'))}</th><th>${escapeHtml(L('td_receiver'))}</th><th>${escapeHtml(L('td_checklist'))}</th><th>${escapeHtml(L('report_issues'))}</th></tr></thead>
          <tbody>
            ${allIssues.map(({t,i}) => {
              const d = getDept(t.department);
              return `<tr>
                <td>${d?.icon||''} ${escapeHtml(dn(d))}</td>
                <td>${escapeHtml(t.zone)}</td>
                <td>${escapeHtml(t.assignedTo.name)}</td>
                <td>${escapeHtml(i.text)}</td>
                <td>${escapeHtml(i.issueNote||'-')}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>`;
      })()}

      <h3 class="mt-2">${escapeHtml(L('chain_step1'))}</h3>
      ${ assignerRows ? `
        <table>
          <thead><tr>
            <th>${escapeHtml(L('mgr_th_assigner'))}</th>
            <th>${escapeHtml(L('mgr_th_role'))}</th>
            <th>${escapeHtml(L('mgr_th_count'))}</th>
            <th>${escapeHtml(L('mgr_th_workers'))}</th>
            <th>${escapeHtml(L('mgr_th_depts'))}</th>
            <th>${escapeHtml(L('mgr_th_done'))}</th>
            <th>${escapeHtml(L('mgr_th_pending'))}</th>
          </tr></thead>
          <tbody>${assignerRows}</tbody>
        </table>
      ` : `<div class="muted small">${escapeHtml(L('reward_no_assigners'))}</div>` }

      <h3 class="mt-2">${escapeHtml(L('chain_step2'))}</h3>
      ${ empEvalRows ? `
        <table>
          <thead><tr>
            <th>${escapeHtml(L('eval_emp_th_name'))}</th>
            <th>${escapeHtml(L('eval_emp_th_total'))}</th>
            <th>${escapeHtml(L('eval_emp_th_done'))}</th>
            <th>${escapeHtml(L('eval_emp_th_photo'))}</th>
            <th>${escapeHtml(L('eval_emp_th_iss'))}</th>
            <th>${escapeHtml(L('eval_emp_th_score'))}</th>
            <th>${escapeHtml(L('eval_emp_th_grade'))}</th>
          </tr></thead>
          <tbody>${empEvalRows}</tbody>
        </table>
      ` : `<div class="muted small">${escapeHtml(L('reward_no_workers'))}</div>` }

      <h3 class="mt-2">${escapeHtml(L('chain_step3'))}</h3>
      <div class="banner info small" style="margin-bottom:0.5rem;">${escapeHtml(L('reward_motivation'))} — ${escapeHtml(L('reward_table_legend'))}</div>
      ${ pendingRewards.length > 0 ? `
        <div class="row wrap" style="gap:0.5rem; margin-bottom:0.5rem;">
          <span class="pill pill-yellow">${escapeHtml(L('reward_pending_n'))}: <b>${pendingRewards.length}</b></span>
          <span class="pill pill-green">${escapeHtml(L('reward_total_pts'))}: <b>${totalPoints}</b></span>
          <span class="pill pill-green">${escapeHtml(L('reward_total_cash'))}: <b>$${totalCash}</b></span>
        </div>
        <table>
          <thead><tr>
            <th>${escapeHtml(L('reward_th_emp'))}</th>
            <th>${escapeHtml(L('reward_th_score'))}</th>
            <th>${escapeHtml(L('reward_th_grade'))}</th>
            <th>${escapeHtml(L('reward_th_points'))}</th>
            <th>${escapeHtml(L('reward_th_cash'))}</th>
            <th>${escapeHtml(L('reward_th_action'))}</th>
          </tr></thead>
          <tbody>${pendingRewards.map(r => rewardRow(r, false)).join('')}</tbody>
        </table>
        ${ pendingRewards.some(r => r.points > 0) ? `
          <button class="btn btn-primary btn-block mt-1 no-print" onclick="doPayAllPending()">${escapeHtml(L('reward_pay_all'))}</button>
        ` : ''}
      ` : `<div class="muted small">${escapeHtml(L('reward_no_data'))}</div>` }

      <h3 class="mt-2">${escapeHtml(L('chain_step4'))}</h3>
      ${ paidRewards.length > 0 ? `
        <div class="row wrap" style="gap:0.5rem; margin-bottom:0.5rem;">
          <span class="pill pill-approved">${escapeHtml(L('reward_paid_n'))}: <b>${paidRewards.length}</b></span>
          <span class="pill pill-approved">${escapeHtml(L('reward_paid_today'))}: <b>$${totalPaidCash}</b></span>
        </div>
        <table>
          <thead><tr>
            <th>${escapeHtml(L('reward_th_emp'))}</th>
            <th>${escapeHtml(L('reward_th_score'))}</th>
            <th>${escapeHtml(L('reward_th_grade'))}</th>
            <th>${escapeHtml(L('reward_th_points'))}</th>
            <th>${escapeHtml(L('reward_th_cash'))}</th>
            <th>${escapeHtml(L('reward_th_paid_at'))}</th>
            <th>${escapeHtml(L('reward_th_paid_by'))}</th>
            <th>${escapeHtml(L('reward_th_action'))}</th>
          </tr></thead>
          <tbody>${paidRewards.map(r => rewardRow(r, true)).join('')}</tbody>
        </table>
      ` : `<div class="muted small">${escapeHtml(L('reward_no_paid'))}</div>` }

      ${ isGroup ? renderOwnerEvalSection(date, sh, group, tasks) : '' }
      ${ isGroup ? renderCrossStoreRanking(date, sh, group) : '' }

      <div class="mt-2 small muted">${escapeHtml(L('report_generated'))}: ${fmtDateTime(Date.now())} · ${escapeHtml(state.user?.name||'')}</div>
    </div>
  `;
}

// ===== 오너 평가 입력 섹션 (👔 지점장 + 📋 부문 관리자) =====
function renderOwnerEvalSection(date, shift, group, tasks) {
  const role = getRole(state.user.role);
  const canEval = !!role.canEvaluate;
  const store = state.settings.store;
  const smName = getStoreManager(store);

  // 이 부문/지점에서 업무를 지시한 관리자들 (점장 제외)
  const managers = [...new Set(tasks.map(t => t.assignedBy?.name).filter(Boolean))]
    .filter(n => n !== smName);

  // ----- 👔 지점장 평가 (강조) -----
  const smEvalHtml = `
    <h3 class="mt-2" style="color:#dc2626;">${escapeHtml(L('sm_section'))}</h3>
    <div class="banner ${canEval?'info':'warn'} small" style="margin-bottom:0.5rem;">${escapeHtml(L('sm_intro'))}</div>
    <div class="card" style="border-left:5px solid #dc2626; background:#fff5f5;">
      <div class="field" style="margin-bottom:0.5rem;">
        <label style="font-weight:700;">${escapeHtml(L('sm_name_label'))}</label>
        <div class="row" style="gap:0.4rem;">
          <input type="text" id="sm-name-${group.id}" class="input" style="flex:1;"
            placeholder="${escapeHtml(L('sm_name_ph'))}" value="${escapeHtml(smName||'')}" ${canEval?'':'disabled'}>
          ${canEval?`<button class="btn btn-primary btn-sm" onclick="doSetStoreManager('${group.id}')">${escapeHtml(smName?L('sm_change_btn'):L('sm_set_btn'))}</button>`:''}
        </div>
      </div>
      ${ smName ? renderEvalRow(date, shift, group, store, smName, '👔 ' + smName, '점장', canEval, true) : `
        <div class="muted small">${escapeHtml(L('sm_not_set'))}</div>
      ` }
    </div>
  `;

  // ----- 📋 부문 관리자 평가 -----
  const mgrEvalHtml = managers.length === 0 ? `
    <h3 class="mt-2">${escapeHtml(L('mgr_section'))}</h3>
    <div class="muted small">${escapeHtml(L('owner_no_managers'))}</div>
  ` : `
    <h3 class="mt-2">${escapeHtml(L('mgr_section'))}</h3>
    <div class="banner ${canEval?'info':'warn'} small" style="margin-bottom:0.5rem;">${escapeHtml(L('mgr_section_intro'))}</div>
    <table>
      <thead><tr>
        <th>${escapeHtml(L('owner_eval_target'))}</th>
        <th title="${escapeHtml(L('owner_consistency_d'))}">${escapeHtml(L('owner_consistency'))}</th>
        <th title="${escapeHtml(L('owner_detail_d'))}">${escapeHtml(L('owner_detail'))}</th>
        <th title="${escapeHtml(L('owner_fulfillment_d'))}">${escapeHtml(L('owner_fulfillment'))}</th>
        <th>${escapeHtml(L('owner_eval_total'))}</th>
        <th>${escapeHtml(L('btn_save'))}</th>
      </tr></thead>
      <tbody>
        ${managers.map(name => {
          const tRow = tasks.find(t => t.assignedBy?.name === name);
          const role2 = tRow?.assignedBy?.roleName || '';
          return renderEvalRow(date, shift, group, store, name, name, role2, canEval, false);
        }).join('')}
      </tbody>
    </table>
  `;

  return `
    <h3 class="mt-2">${escapeHtml(L('owner_section'))}</h3>
    <div class="banner info small" style="margin-bottom:0.5rem;">${escapeHtml(L('owner_intro'))}${canEval?'':'<br><b>👁 view-only</b> — 👑 오너 로그인 시 입력 가능.'}</div>

    ${smEvalHtml}
    ${mgrEvalHtml}

    ${canEval ? `
      <div class="mt-1">
        <textarea id="oe-${group.id}-note" class="textarea" placeholder="${escapeHtml(L('owner_eval_note_ph'))}" rows="2"></textarea>
      </div>
    ` : ''}
  `;
}

// 평가 1행 HTML (점장 또는 관리자)
function renderEvalRow(date, shift, group, store, name, displayName, roleLabel, canEval, isSM) {
  const e = getOwnerEval(date, store, group.id, name);
  const c = e ? e.consistency : 0;
  const d = e ? e.detail : 0;
  const f = e ? e.fulfillment : 0;
  const total = c + d + f;
  const safeId = name.replace(/[^a-zA-Z0-9가-힣]/g, '_');
  const rid = `oe-${group.id}-${safeId}`;
  const inputAttrs = canEval ? '' : 'disabled';
  const totalColor = total>=24?'#16a34a':total>=18?'#2563eb':total>=12?'#d97706':'#dc2626';

  if (isSM) {
    // 점장은 큰 카드 형태
    return `
      <div class="row wrap" style="gap:0.6rem; align-items:center;">
        <div style="flex:1; min-width:140px;">
          <div style="font-weight:700;">${escapeHtml(displayName)}</div>
          <div class="small muted">${escapeHtml(roleLabel)}</div>
        </div>
        <div style="text-align:center;">
          <div class="small muted">${escapeHtml(L('owner_consistency'))}</div>
          <input type="number" min="0" max="10" step="1" id="${rid}-c" value="${c}" ${inputAttrs} style="width:60px; padding:0.4rem; text-align:center; font-size:1.1rem;">
        </div>
        <div style="text-align:center;">
          <div class="small muted">${escapeHtml(L('owner_detail'))}</div>
          <input type="number" min="0" max="10" step="1" id="${rid}-d" value="${d}" ${inputAttrs} style="width:60px; padding:0.4rem; text-align:center; font-size:1.1rem;">
        </div>
        <div style="text-align:center;">
          <div class="small muted">${escapeHtml(L('owner_fulfillment'))}</div>
          <input type="number" min="0" max="10" step="1" id="${rid}-f" value="${f}" ${inputAttrs} style="width:60px; padding:0.4rem; text-align:center; font-size:1.1rem;">
        </div>
        <div style="text-align:center;">
          <div class="small muted">${escapeHtml(L('sm_total_label'))}</div>
          <div style="font-size:1.4rem; font-weight:800; color:${totalColor};">${total}/30</div>
        </div>
        ${canEval ? `<button class="btn btn-primary no-print" onclick="saveOwnerEvalForManager('${date}','${shift}','${group.id}','${escapeHtml(name).replace(/'/g, "\\'")}','${rid}')">${escapeHtml(L('btn_save'))}</button>`
          : (e ? `<small class="muted">${fmtDateTime(e.evaluatedAt)}</small>` : `<span class="muted small">—</span>`)}
      </div>
    `;
  }
  // 관리자 행
  return `
    <tr>
      <td>
        <b>${escapeHtml(displayName)}</b><br>
        <small class="muted">${escapeHtml(roleLabel)}</small>
      </td>
      <td><input type="number" min="0" max="10" step="1" id="${rid}-c" value="${c}" ${inputAttrs} style="width:54px; padding:0.3rem; text-align:center;"></td>
      <td><input type="number" min="0" max="10" step="1" id="${rid}-d" value="${d}" ${inputAttrs} style="width:54px; padding:0.3rem; text-align:center;"></td>
      <td><input type="number" min="0" max="10" step="1" id="${rid}-f" value="${f}" ${inputAttrs} style="width:54px; padding:0.3rem; text-align:center;"></td>
      <td><b style="color:${totalColor}">${total}/30</b></td>
      <td>
        ${canEval ? `<button class="btn btn-sm btn-primary no-print" onclick="saveOwnerEvalForManager('${date}','${shift}','${group.id}','${escapeHtml(name).replace(/'/g, "\\'")}','${rid}')">${escapeHtml(L('btn_save'))}</button>`
          : (e ? `<small class="muted">${fmtDateTime(e.evaluatedAt)}</small>` : `<span class="muted small">—</span>`)}
      </td>
    </tr>
  `;
}

// 점장 이름 등록/변경
function doSetStoreManager(groupId) {
  const input = document.getElementById('sm-name-' + groupId);
  if (!input) return;
  const name = input.value.trim();
  if (!name) { toast(L('sm_name_ph'), 'error'); return; }
  setStoreManager(state.settings.store, name);
  toast(L('toast_saved'), 'success');
  render();
}

function saveOwnerEvalForManager(date, shift, groupId, managerName, rid) {
  const c = document.getElementById(`${rid}-c`)?.value || 0;
  const d = document.getElementById(`${rid}-d`)?.value || 0;
  const f = document.getElementById(`${rid}-f`)?.value || 0;
  const note = document.getElementById(`oe-${groupId}-note`)?.value || '';
  saveOwnerEval(date, state.settings.store, groupId, managerName, c, d, f, note);
  toast(L('owner_eval_saved'), 'success');
  render();
}

// ===== 부문 전체 지점 랭킹 (점장/관리자 분리) =====
function renderCrossStoreRanking(date, shift, group) {
  const rows = KMOCS.STORES.map(store => {
    const auto = autoScoreForStoreGroup(date, shift, store, group);
    const sm = smScoreForStoreGroup(date, store, group.id);
    const mgrAvg = mgrAvgScoreForStoreGroup(date, store, group.id);
    const smName = getStoreManager(store);
    return {
      store, smName,
      taskCount: auto.taskCount,
      autoScore: auto.ev ? auto.ev.score : null,
      smScore: sm,
      mgrAvgScore: mgrAvg,
      total: auto.ev ? combinedScoreV2(auto.ev.score, sm, mgrAvg) : null
    };
  }).filter(r => r.taskCount > 0);

  if (rows.length === 0) {
    return `
      <h3 class="mt-2">${escapeHtml(L('ranking_section'))}</h3>
      <div class="muted small">${escapeHtml(L('ranking_no_data'))}</div>
    `;
  }

  rows.sort((a, b) => (b.total || 0) - (a.total || 0));
  const winner = rows[0];

  return `
    <h3 class="mt-2">${escapeHtml(L('ranking_section'))}</h3>
    <div class="banner info small" style="margin-bottom:0.5rem;">
      ${escapeHtml(L('ranking_intro'))}<br>
      <small>가중치: 자동 50% · 점장 30% · 관리자 평균 20%</small>
    </div>
    <table>
      <thead><tr>
        <th>${escapeHtml(L('ranking_th_rank'))}</th>
        <th>${escapeHtml(L('ranking_th_store'))}</th>
        <th>${escapeHtml(L('ranking_th_auto'))}</th>
        <th>${escapeHtml(L('ranking_th_sm'))}</th>
        <th>${escapeHtml(L('ranking_th_mgrs'))}</th>
        <th>${escapeHtml(L('ranking_th_total'))}</th>
        <th>${escapeHtml(L('ranking_th_bonus'))}</th>
      </tr></thead>
      <tbody>
        ${rows.map((r, i) => {
          const isCur = r.store === state.settings.store;
          const isWinner = r === winner && r.total != null;
          return `
            <tr style="${isCur?'background:#fff7ed;':''} ${isWinner?'font-weight:700;':''}">
              <td>${i+1}</td>
              <td>
                ${isCur?'<b>👉 ':''}${escapeHtml(r.store)}${isCur?'</b>':''}
                ${r.smName ? `<br><small class="muted">👔 ${escapeHtml(r.smName)}</small>` : ''}
              </td>
              <td>${r.autoScore != null ? r.autoScore : '-'}</td>
              <td>${r.smScore != null ? `<b style="color:#dc2626;">${r.smScore}/30</b>` : '<span class="muted">—</span>'}</td>
              <td>${r.mgrAvgScore != null ? r.mgrAvgScore + '/30' : '<span class="muted">—</span>'}</td>
              <td style="color:${isWinner?'#16a34a':'#111827'}; font-weight:700;">${r.total != null ? r.total : '-'}</td>
              <td>${isWinner ? `<span class="pill pill-approved">${escapeHtml(L('ranking_bonus_winner'))}</span>` : escapeHtml(L('ranking_bonus_runner'))}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

// ===== 부문 보드 (동료 업무 함께 보기) =====
function viewGroupGrid() {
  const date = todayISO();
  const sh = activeShift();
  const tasks = getStoreTasks(date, sh);
  const myGroupIds = state.user
    ? KMOCS.DEPT_GROUPS.filter(g =>
        tasks.some(t => g.members.includes(t.department) && t.assignedTo?.name === state.user.name)
      ).map(g => g.id)
    : [];

  const cards = KMOCS.DEPT_GROUPS.map(g => {
    const list = tasks.filter(t => g.members.includes(t.department));
    const memberDepts = g.members.map(id => getDept(id)).filter(Boolean);
    const memberLabel = memberDepts.map(d => dn(d)).join(' · ');
    const isMine = myGroupIds.includes(g.id);
    if (list.length === 0) {
      return `
        <button class="group-card empty-group" disabled>
          <div class="header-row">
            <span class="icon-big">${g.icon}</span>
            <div class="title-block">
              <div class="group-title">${escapeHtml(L('group_'+g.id))}</div>
              <div class="group-members">${escapeHtml(memberLabel)}</div>
            </div>
            <div class="score-block">
              <div class="score-num" style="color:#9ca3af;">—</div>
              <div class="small muted">${escapeHtml(L('common_no'))}</div>
            </div>
          </div>
        </button>
      `;
    }
    const total = list.length;
    const done = list.filter(t => ['green','verified','approved'].includes(t.status)).length;
    const inProg = list.filter(t => t.status === 'yellow').length;
    const issues = list.filter(t => t.status === 'red').length;
    const pct = total ? Math.round(done/total*100) : 0;
    const workers = new Set(list.map(t => t.assignedTo?.name).filter(Boolean)).size;
    const assigners = new Set(list.map(t => t.assignedBy?.name).filter(Boolean)).size;
    const accent = issues > 0 ? '#dc2626' : done === total ? '#16a34a' : '#f59e0b';
    return `
      <button class="group-card" style="border-color:${accent}; ${isMine?'box-shadow:0 0 0 3px rgba(220,38,38,0.15);':''}"
        onclick="navigate('group-board',{groupId:'${g.id}'})">
        <div class="accent" style="background:${accent};"></div>
        <div class="header-row">
          <span class="icon-big">${g.icon}</span>
          <div class="title-block">
            <div class="group-title" style="color:${accent};">${escapeHtml(L('group_'+g.id))}</div>
            <div class="group-members">${escapeHtml(memberLabel)}</div>
            ${isMine ? `<div class="small" style="color:#dc2626; font-weight:700; margin-top:0.15rem;">${escapeHtml(L('group_board_my_group'))}</div>` : ''}
          </div>
          <div class="score-block">
            <div class="score-num" style="color:${accent};">${pct}%</div>
            <div class="small muted">${done}/${total}</div>
          </div>
        </div>
        <div class="footer-row">
          <span>📋 <b>${total}</b></span>
          <span>👷 <b>${workers}</b></span>
          <span>📝 <b>${assigners}</b></span>
          ${inProg > 0 ? `<span style="color:#92400e;">⏳ <b>${inProg}</b></span>` : ''}
          ${issues > 0 ? `<span style="color:#dc2626;">⚠ <b>${issues}</b></span>` : ''}
          <span class="arrow">→</span>
        </div>
      </button>
    `;
  }).join('');

  return `
    <h2>🧑‍🤝‍🧑 ${escapeHtml(L('group_grid_title'))} <span class="shift-pill ${sh}">${shiftDef(sh).icon} ${escapeHtml(L('shift_'+sh))}</span></h2>
    <div class="muted small mb-2">${fmtDateKor(date)} · ${escapeHtml(state.settings.store)}</div>
    <div class="banner info small">${escapeHtml(L('group_grid_intro'))}</div>
    <div class="group-list">${cards}</div>
  `;
}

function viewGroupBoard(groupId, mode) {
  const date = todayISO();
  const sh = activeShift();
  const group = KMOCS.DEPT_GROUPS.find(g => g.id === groupId);
  if (!group) return '<div class="empty">부문 없음</div>';
  const tasks = getStoreTasks(date, sh).filter(t => group.members.includes(t.department));

  if (tasks.length === 0) {
    return `
      <button class="btn btn-sm" onclick="navigate('group-grid')">${escapeHtml(L('group_back'))}</button>
      <h2 class="mt-2">${group.icon} ${escapeHtml(L('group_'+group.id))}</h2>
      <div class="empty"><div class="ico">📭</div><p>${escapeHtml(L('group_board_no_tasks'))}</p></div>
    `;
  }

  // 통계
  const total = tasks.length;
  const done = tasks.filter(t => ['green','verified','approved'].includes(t.status)).length;
  const inProg = tasks.filter(t => t.status === 'yellow').length;
  const issues = tasks.filter(t => t.status === 'red').length;
  const photoCount = tasks.reduce((s,t) => s + (t.checklist||[]).reduce((s2,i) => s2 + (i.photos?.length||0), 0), 0);
  const workers = new Set(tasks.map(t => t.assignedTo?.name).filter(Boolean));
  const assigners = new Set(tasks.map(t => t.assignedBy?.name).filter(Boolean));

  // 그룹화 함수
  const groupBy = (key) => {
    const map = {};
    tasks.forEach(t => {
      const k = key(t);
      if (!map[k]) map[k] = [];
      map[k].push(t);
    });
    return map;
  };

  let bodyHtml = '';
  if (mode === 'assigner') {
    const grouped = groupBy(t => t.assignedBy?.name || '-');
    bodyHtml = Object.keys(grouped).sort().map(name => {
      const list = grouped[name];
      const role = list[0].assignedBy?.roleName || '';
      return `
        <div class="card flat" style="padding:0.6rem 0.85rem;">
          <h3 style="margin-bottom:0.4rem;">📝 ${escapeHtml(name)} <small class="muted">${escapeHtml(role)} · ${list.length}건</small></h3>
          ${list.map(t => taskCardHtml(t, 'verify-task')).join('')}
        </div>
      `;
    }).join('');
  } else if (mode === 'worker') {
    const grouped = groupBy(t => t.assignedTo?.name || '-');
    bodyHtml = Object.keys(grouped).sort().map(name => {
      const list = grouped[name];
      return `
        <div class="card flat" style="padding:0.6rem 0.85rem;">
          <h3 style="margin-bottom:0.4rem;">👷 ${escapeHtml(name)} <small class="muted">${list.length}건</small></h3>
          ${list.map(t => taskCardHtml(t, 'task-detail')).join('')}
        </div>
      `;
    }).join('');
  } else {
    // subdept (default)
    const grouped = groupBy(t => t.department);
    bodyHtml = Object.keys(grouped).map(deptId => {
      const d = getDept(deptId);
      const list = grouped[deptId];
      return `
        <div class="card flat" style="padding:0.6rem 0.85rem;">
          <h3 style="margin-bottom:0.4rem;">${d?.icon||'📌'} ${escapeHtml(dn(d))} <small class="muted">${list.length}건</small></h3>
          ${list.map(t => taskCardHtml(t, 'task-detail')).join('')}
        </div>
      `;
    }).join('');
  }

  return `
    <button class="btn btn-sm" onclick="navigate('group-grid')">${escapeHtml(L('group_back'))}</button>
    <h2 class="mt-2">${group.icon} ${escapeHtml(L('group_'+group.id))} <span class="shift-pill ${sh}">${shiftDef(sh).icon} ${escapeHtml(L('shift_'+sh))}</span></h2>
    <div class="muted small mb-2">${fmtDateKor(date)} · ${escapeHtml(state.settings.store)} · ${escapeHtml(group.members.map(id=>dn(getDept(id))).join(' · '))}</div>

    <div class="banner info small">${escapeHtml(L('group_board_intro'))}</div>

    <div class="card">
      <div class="row wrap" style="gap:0.5rem;">
        <span class="pill pill-gray">📋 ${total}</span>
        <span class="pill pill-green">✅ ${done}</span>
        <span class="pill pill-yellow">⏳ ${inProg}</span>
        ${issues > 0 ? `<span class="pill pill-red">⚠ ${issues}</span>` : ''}
        <span class="pill pill-verified">📷 ${photoCount}</span>
        <span class="pill pill-gray">👷 ${workers.size}</span>
        <span class="pill pill-gray">📝 ${assigners.size}</span>
      </div>
    </div>

    <div class="btn-group mt-2">
      <button class="btn btn-sm ${mode==='subdept'?'btn-primary':''}" onclick="navigate('group-board',{groupId:'${group.id}',mode:'subdept'})">${escapeHtml(L('group_view_mode_subdept'))}</button>
      <button class="btn btn-sm ${mode==='assigner'?'btn-primary':''}" onclick="navigate('group-board',{groupId:'${group.id}',mode:'assigner'})">${escapeHtml(L('group_view_mode_assigner'))}</button>
      <button class="btn btn-sm ${mode==='worker'?'btn-primary':''}" onclick="navigate('group-board',{groupId:'${group.id}',mode:'worker'})">${escapeHtml(L('group_view_mode_worker'))}</button>
    </div>

    <div class="mt-2">${bodyHtml}</div>
  `;
}

function doPayReward(id) {
  if (!confirm(L('reward_confirm_pay'))) return;
  payReward(id);
  toast(L('toast_saved'), 'success');
  render();
}
function doUnpayReward(id) {
  unpayReward(id);
  render();
}
function doPayAllPending() {
  if (!confirm(L('reward_confirm_pay'))) return;
  const n = payAllPending(todayISO(), activeShift());
  toast(`${n} → ${L('reward_status_paid')}`, 'success');
  render();
}

// --- STAFF ---
function viewStaff() {
  return `
    <h2>👥 ${escapeHtml(L('nav_staff'))}</h2>
    <div class="muted small mb-2">${escapeHtml(L('staff_intro'))}</div>

    <div class="card">
      <div class="field">
        <label>${escapeHtml(L('staff_name'))}</label>
        <input id="staff-name" class="input" placeholder="${escapeHtml(L('login_name_ph'))}">
      </div>
      <div class="field">
        <label>${escapeHtml(L('staff_role'))}</label>
        <select id="staff-role" class="select">
          ${KMOCS.ROLES.map(r => `<option value="${r.id}">${r.icon} ${escapeHtml(L('role_'+r.id))}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-primary btn-block" onclick="doAddStaff()">${escapeHtml(L('staff_add'))}</button>
    </div>

    <h3 class="mt-2">${escapeHtml(L('staff_registered'))} (${state.staff.length})</h3>
    ${state.staff.length === 0 ? `<div class="muted small">${escapeHtml(L('staff_empty'))}</div>` :
      state.staff.map(s => {
        const r = getRole(s.role) || { icon: '👤', name: s.role };
        return `
          <div class="card">
            <div class="card-row">
              <div>
                <div style="font-weight:700;">${r.icon} ${escapeHtml(s.name)}</div>
                <div class="small muted">${escapeHtml(L('role_'+s.role)||r.name)}</div>
              </div>
              <button class="btn btn-sm btn-danger" onclick="doRemoveStaff('${s.id}')">${escapeHtml(L('btn_delete'))}</button>
            </div>
          </div>
        `;
      }).join('')
    }
  `;
}
function doAddStaff() {
  const name = document.getElementById('staff-name').value.trim();
  const role = document.getElementById('staff-role').value;
  if (!name) { toast('이름 필요', 'error'); return; }
  addStaff(name, role);
  toast('추가됨', 'success');
  render();
}
function doRemoveStaff(id) {
  if (!confirm('삭제?')) return;
  removeStaff(id);
  render();
}

// --- NOTICES ---
let _noticeSearch = '';
function setNoticeSearch(v) {
  _noticeSearch = (v || '').toLowerCase();
  // 인라인 갱신 (re-render 안 함 — input focus 유지)
  const lst = document.getElementById('notices-list');
  if (lst) lst.innerHTML = renderNoticesList();
}
function renderNoticesList() {
  const list = getVisibleNotices();
  const q = _noticeSearch.trim();
  const filtered = q
    ? list.filter(n => (n.title||'').toLowerCase().includes(q) || (n.body||'').toLowerCase().includes(q))
    : list;
  if (filtered.length === 0) {
    const lang = state.settings.lang || 'ko';
    const msg = q ? (lang==='ko'?`"${q}" 검색 결과 없음`:`No results for "${q}"`) : escapeHtml(L('notices_empty'));
    return `<div class="empty"><div class="ico">📭</div><p>${msg}</p></div>`;
  }
  return filtered.map(n => renderNoticeCard(n)).join('');
}
function viewNotices() {
  const role = getRole(state.user.role);
  const lang = state.settings.lang || 'ko';
  const ph = lang==='ko'?'🔍 제목/내용 검색...':lang==='es'?'🔍 Buscar...':'🔍 Search title/body...';
  return `
    <div class="row between mb-1">
      <h2 style="margin:0">📢 ${escapeHtml(L('notices_title'))}</h2>
      ${role.canAssign?`<button class="btn btn-primary btn-sm" onclick="navigate('notices-new')">${escapeHtml(L('notices_new'))}</button>`:''}
    </div>
    <div class="muted small mb-2">${escapeHtml(state.settings.store)}</div>

    <input class="input notice-search" placeholder="${ph}" oninput="setNoticeSearch(this.value)" value="${escapeHtml(_noticeSearch)}">

    <div id="notices-list">${renderNoticesList()}</div>
  `;
}

function renderNoticeCard(n) {
  const k = n.kind === 'urgent' ? 'urgent' : n.kind === 'all' ? 'all' : 'store';
  const kind = KMOCS.NOTICE_KINDS.find(x => x.id === k);
  const role = getRole(state.user.role);
  return `
    <div class="notice-card kind-${k} ${n.pinned?'pinned':''}">
      <div class="head">
        <div class="title">
          ${n.pinned?'<span class="pinned-mark">📌</span>':''}
          ${kind?.icon||''}
          <span>${escapeHtml(n.title)}</span>
        </div>
        <span class="kind-pill" style="background:${kind?.color||'#6b7280'}; color:#fff;">${escapeHtml(kind?.label[state.settings.lang] || k)}</span>
      </div>
      <div class="meta">
        ${escapeHtml(n.createdBy.name)} · ${fmtDateTime(n.createdAt)}
        ${n.kind === 'store'?` · 🏬 ${escapeHtml(n.target)}`:n.kind === 'all'?` · 🌐 ${escapeHtml(L('notices_target_all'))}`:''}
      </div>
      <div class="body">${escapeHtml(n.body)}</div>
      ${(n.photos||[]).length > 0?`
        <div class="photo-grid">
          ${n.photos.map(p=>`<div class="photo-thumb"><img src="${p}" onclick="openLightbox('${p}')"></div>`).join('')}
        </div>`:''}
      ${role.canAssign?`
        <div class="actions">
          <button class="btn btn-sm" onclick="togglePinNotice('${n.id}')">${n.pinned?'📌 고정 해제':'📌 '+L('notices_pin')}</button>
          <button class="btn btn-sm btn-danger" onclick="removeNotice('${n.id}')">${escapeHtml(L('notices_delete'))}</button>
        </div>`:''}
    </div>
  `;
}
function togglePinNotice(id) { togglePin(id); render(); }
function removeNotice(id) {
  if (!confirm('공지를 삭제하시겠습니까?')) return;
  deleteNotice(id);
  toast('삭제됨', 'success');
  render();
}

// --- NEW NOTICE ---
let _noticePhotos = [];
function viewNoticeNew() {
  _noticePhotos = [];
  const lang = state.settings.lang || 'ko';
  const tx = {
    title:   lang==='ko'?'제목':lang==='es'?'Título':'Title',
    body:    lang==='ko'?'내용':lang==='es'?'Contenido':'Body',
    photo:   lang==='ko'?'사진 (선택)':lang==='es'?'Foto (opcional)':'Photo (optional)',
    addPh:   lang==='ko'?'사진 추가':lang==='es'?'Agregar foto':'Add photo',
    target:  lang==='ko'?'어디에 보낼까?':lang==='es'?'¿A dónde enviar?':'Send to?',
    allStores: lang==='ko'?'🌍 모든 매장':lang==='es'?'🌍 Todas':'🌍 All stores',
    oneStore:  lang==='ko'?'🏬 특정 매장만':lang==='es'?'🏬 Una tienda':'🏬 One store',
    urgent:    lang==='ko'?'🚨 긴급 (상단 고정)':lang==='es'?'🚨 Urgente':'🚨 Urgent (pin top)'
  };
  return `
    <button class="btn btn-sm" onclick="navigate('notices')">← ${escapeHtml(L('btn_back'))}</button>
    <h2 class="mt-2">📢 ${escapeHtml(L('notices_new'))}</h2>

    <div class="card">
      <div class="field">
        <label>${tx.target}</label>
        <div class="row" style="gap:0.5rem;flex-wrap:wrap;margin-bottom:0.5rem;">
          <label class="scope-pill"><input type="radio" name="n-scope" value="all" checked onchange="updateNoticeScope()"> ${tx.allStores}</label>
          <label class="scope-pill"><input type="radio" name="n-scope" value="one" onchange="updateNoticeScope()"> ${tx.oneStore}</label>
        </div>
        <div id="n-store-grid" style="display:none;">
          <div class="muted small mb-1">${lang==='ko'?'표시할 매장 선택 (여러 개 가능)':lang==='es'?'Selecciona tiendas (múltiple)':'Select stores (multiple)'}</div>
          <div class="store-pick-grid">
            ${KMOCS.STORES.map(s => {
              const code = (KMOCS.STORE_CODES && KMOCS.STORE_CODES[s]) || { code: s.charAt(0), color: '#9ca3af' };
              return `
                <label class="store-pick-card">
                  <input type="checkbox" class="n-target-cb" value="${escapeHtml(s)}" ${s===state.settings.store?'checked':''}>
                  <span class="store-pick-pill" style="background:${code.color}">${code.code}</span>
                  <span class="store-pick-name">${escapeHtml(s)}</span>
                </label>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <div class="field">
        <label>${tx.title}</label>
        <input id="n-title" class="input" placeholder="${escapeHtml(L('notices_title_ph'))}">
      </div>

      <div class="field">
        <label>${tx.body}</label>
        <textarea id="n-body" class="textarea" placeholder="${escapeHtml(L('notices_body_ph'))}" rows="5"></textarea>
      </div>

      <div class="field">
        <label>${tx.photo}</label>
        <div class="photo-grid" id="n-photos">
          <label class="photo-add">
            <span class="ico">📷</span><span>${tx.addPh}</span>
            <input type="file" accept="image/*" capture="environment" hidden multiple onchange="addNoticePhoto(event)">
          </label>
        </div>
      </div>

      <div class="field">
        <label class="toggle">
          <input type="checkbox" id="n-urgent">
          <span class="switch"></span>
          <span>${tx.urgent}</span>
        </label>
      </div>

      <button class="btn btn-primary btn-block btn-lg" onclick="submitNotice()">${escapeHtml(L('notices_publish'))}</button>
    </div>
  `;
}
function updateNoticeTargetVisibility() {
  const kind = document.getElementById('n-kind').value;
  const field = document.getElementById('n-target-field');
  const hint = document.getElementById('n-kind-hint');
  const hints = window.__noticeHints || {};
  if (kind === 'store') {
    field.style.display = '';
    if (hint) hint.innerText = hints.store || '';
  } else if (kind === 'all') {
    field.style.display = 'none';
    if (hint) hint.innerText = hints.all || '';
  } else if (kind === 'urgent') {
    field.style.display = 'none';
    if (hint) hint.innerText = hints.urgent || '';
  }
}
// 페이지 첫 로드 시 hint 초기화
document.addEventListener('click', function _initNoticeHint(e) {
  if (currentView === 'notices-new' && document.getElementById('n-kind') && !document.getElementById('n-kind-hint')?.innerText) {
    updateNoticeTargetVisibility();
  }
}, true);
async function addNoticePhoto(event) {
  const files = Array.from(event.target.files || []);
  for (const f of files) {
    try {
      const url = await compressImage(f, 1024, 0.7);
      _noticePhotos.push(url);
    } catch (e) { toast('사진 실패', 'error'); }
  }
  renderNoticePhotos();
}
function renderNoticePhotos() {
  const host = document.getElementById('n-photos');
  if (!host) return;
  host.innerHTML = _noticePhotos.map((p,i) => `
    <div class="photo-thumb">
      <img src="${p}" onclick="openLightbox('${p}')">
      <button class="remove" onclick="removeNoticePhoto(${i})">✕</button>
    </div>
  `).join('') + `
    <label class="photo-add">
      <span class="ico">📷</span><span>${state.settings.lang==='ko'?'사진 추가':state.settings.lang==='es'?'Agregar foto':'Add photo'}</span>
      <input type="file" accept="image/*" capture="environment" hidden multiple onchange="addNoticePhoto(event)">
    </label>
  `;
}
function removeNoticePhoto(i) {
  _noticePhotos.splice(i, 1);
  renderNoticePhotos();
}
function updateNoticeScope() {
  const scope = document.querySelector('input[name="n-scope"]:checked')?.value;
  const grid = document.getElementById('n-store-grid');
  if (grid) grid.style.display = (scope === 'one') ? '' : 'none';
}
function submitNotice() {
  const scope = document.querySelector('input[name="n-scope"]:checked')?.value || 'all';
  const urgent = document.getElementById('n-urgent')?.checked || false;
  const title = document.getElementById('n-title').value.trim();
  const body = document.getElementById('n-body').value.trim();
  const lang = state.settings.lang || 'ko';
  if (!title) { toast(lang==='ko'?'제목을 입력하세요':'Enter title', 'error'); return; }
  if (!body)  { toast(lang==='ko'?'내용을 입력하세요':'Enter body', 'error'); return; }
  // 매장 선택 (멀티)
  let targets = null;
  if (scope === 'one') {
    targets = Array.from(document.querySelectorAll('.n-target-cb:checked')).map(cb => cb.value);
    if (targets.length === 0) { toast(lang==='ko'?'매장을 1개 이상 선택하세요':'Select at least 1 store', 'error'); return; }
  }
  addNotice({
    kind: urgent ? 'urgent' : (scope === 'all' ? 'all' : 'store'),
    target: targets && targets.length === 1 ? targets[0] : null,  // 단일 매장은 기존 호환
    targets: targets,                                              // 다중 매장은 새 필드
    title, body,
    pinned: urgent,
    photos: _noticePhotos
  });
  toast(lang==='ko'?'✅ 공지 게시됨':lang==='es'?'✅ Publicado':'✅ Published', 'success');
  navigate('notices');
}

// --- FREE REPORT ---
function viewFreeReport() {
  const list = getStoreReports();
  return `
    <div class="row between mb-1">
      <h2 style="margin:0">📷 ${escapeHtml(L('freerep_title'))}</h2>
      <button class="btn btn-primary btn-sm" onclick="navigate('freerep-new')">${escapeHtml(L('freerep_new'))}</button>
    </div>
    <div class="muted small mb-2">${escapeHtml(L('freerep_desc'))}</div>

    ${list.length === 0?`<div class="empty"><div class="ico">📭</div><p>${escapeHtml(L('freerep_empty'))}</p></div>`:
      list.map(r => renderReportCard(r)).join('')}
  `;
}
function renderReportCard(r) {
  const role = getRole(state.user.role);
  const kindIdx = ['issue','quality','facility','cleanliness','safety','other'].indexOf(r.kind);
  const kindLabel = (I18N.freerep_kinds[state.settings.lang]||I18N.freerep_kinds.ko)[kindIdx]||r.kind;
  const statusLabel = r.status === 'resolved' ? L('freerep_resolved')
                     : r.status === 'acknowledged' ? L('freerep_acknowledged')
                     : L('freerep_open');
  const statusPill = r.status === 'resolved' ? 'pill-green' : r.status === 'acknowledged' ? 'pill-verified' : 'pill-yellow';
  return `
    <div class="report-card k-${r.kind}">
      <div class="head">
        <span class="kind-pill">${escapeHtml(kindLabel)}</span>
        <span class="pill ${statusPill}">${escapeHtml(statusLabel)}</span>
      </div>
      <div style="font-weight:700; font-size:1rem; margin-bottom:0.3rem;">${escapeHtml(r.title)}</div>
      <div class="meta">
        <span>👤 ${escapeHtml(r.createdBy.name)}</span>
        <span>🕐 ${fmtDateTime(r.createdAt)}</span>
      </div>
      ${r.body?`<div style="font-size:0.88rem; white-space:pre-wrap; margin-bottom:0.4rem;">${escapeHtml(r.body)}</div>`:''}
      ${(r.photos||[]).length > 0?`
        <div class="photo-grid">
          ${r.photos.map(p=>`<div class="photo-thumb"><img src="${p}" onclick="openLightbox('${p}')"></div>`).join('')}
        </div>`:''}
      ${role.canAssign?`
        <div class="actions" style="display:flex; gap:0.4rem; flex-wrap:wrap; margin-top:0.5rem;">
          ${r.status === 'open'?`<button class="btn btn-sm btn-outline" onclick="ackReport('${r.id}')">확인 표시</button>`:''}
          ${r.status !== 'resolved'?`<button class="btn btn-sm btn-success" onclick="resolveReport('${r.id}')">처리 완료</button>`:''}
          <button class="btn btn-sm btn-danger" onclick="removeReport('${r.id}')">${escapeHtml(L('btn_delete'))}</button>
        </div>`:''}
    </div>
  `;
}
function ackReport(id) {
  updateReport(id, r => { r.status = 'acknowledged'; r.acknowledgedBy = state.user.name; r.acknowledgedAt = Date.now(); });
  toast('확인됨', 'success'); render();
}
function resolveReport(id) {
  updateReport(id, r => { r.status = 'resolved'; r.resolvedAt = Date.now(); });
  toast('처리 완료', 'success'); render();
}
function removeReport(id) {
  if (!confirm('삭제?')) return;
  deleteReport(id); render();
}

// --- NEW FREE REPORT ---
let _reportPhotos = [];
function viewFreeReportNew() {
  _reportPhotos = [];
  const kindOptions = (I18N.freerep_kinds[state.settings.lang]||I18N.freerep_kinds.ko);
  const ids = ['issue','quality','facility','cleanliness','safety','other'];
  return `
    <button class="btn btn-sm" onclick="navigate('freerep')">← ${escapeHtml(L('btn_back'))}</button>
    <h2 class="mt-2">📷 ${escapeHtml(L('freerep_new'))}</h2>

    <div class="card">
      <div class="field">
        <label>${escapeHtml(L('freerep_kind'))}</label>
        <select id="r-kind" class="select">
          ${ids.map((id,i) => `<option value="${id}">${escapeHtml(kindOptions[i])}</option>`).join('')}
        </select>
      </div>

      <div class="field">
        <label>제목</label>
        <input id="r-title" class="input" placeholder="${escapeHtml(L('freerep_title_ph'))}">
      </div>

      <div class="field">
        <label>상세 (선택)</label>
        <textarea id="r-body" class="textarea" placeholder="${escapeHtml(L('freerep_body_ph'))}" rows="4"></textarea>
      </div>

      <div class="field">
        <label>사진</label>
        <div class="photo-grid" id="r-photos">
          <label class="photo-add">
            <span class="ico">📷</span><span>${escapeHtml(L('freerep_photo'))}</span>
            <input type="file" accept="image/*" capture="environment" hidden multiple onchange="addReportPhoto(event)">
          </label>
        </div>
      </div>

      <button class="btn btn-primary btn-block btn-lg" onclick="submitReportFree()">${escapeHtml(L('freerep_submit'))}</button>
    </div>
  `;
}
async function addReportPhoto(event) {
  const files = Array.from(event.target.files || []);
  for (const f of files) {
    try {
      const url = await compressImage(f, 1024, 0.7);
      _reportPhotos.push(url);
    } catch (e) { toast('사진 실패', 'error'); }
  }
  renderReportPhotos();
}
function renderReportPhotos() {
  const host = document.getElementById('r-photos');
  if (!host) return;
  host.innerHTML = _reportPhotos.map((p,i) => `
    <div class="photo-thumb">
      <img src="${p}" onclick="openLightbox('${p}')">
      <button class="remove" onclick="removeReportPhoto(${i})">✕</button>
    </div>
  `).join('') + `
    <label class="photo-add">
      <span class="ico">📷</span><span>${escapeHtml(L('freerep_photo'))}</span>
      <input type="file" accept="image/*" capture="environment" hidden multiple onchange="addReportPhoto(event)">
    </label>
  `;
}
function removeReportPhoto(i) { _reportPhotos.splice(i, 1); renderReportPhotos(); }
function submitReportFree() {
  const kind = document.getElementById('r-kind').value;
  const title = document.getElementById('r-title').value.trim();
  const body = document.getElementById('r-body').value.trim();
  if (!title) { toast('제목 입력', 'error'); return; }
  addFreeReport({ kind, title, body, photos: _reportPhotos });
  toast('리포트 제출됨', 'success');
  navigate('freerep');
}

// --- SETTINGS ---
function viewSettings() {
  return `
    <h2>⚙️ ${escapeHtml(L('nav_settings'))}</h2>

    <div class="card">
      <div class="field">
        <label>${escapeHtml(L('login_store'))}</label>
        <select id="set-store" class="select">
          ${KMOCS.STORES.map(s => `<option ${s===state.settings.store?'selected':''}>${escapeHtml(s)}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-primary btn-block" onclick="saveSettings()">${escapeHtml(L('btn_save'))}</button>
    </div>

    <div class="card">
      <h3>${escapeHtml(L('set_user'))}</h3>
      <dl class="kv">
        <dt>${escapeHtml(L('staff_name'))}</dt><dd>${escapeHtml(state.user?.name||'-')}</dd>
        <dt>${escapeHtml(L('staff_role'))}</dt><dd>${escapeHtml(L('role_'+state.user?.role)||'-')}</dd>
        <dt>${escapeHtml(L('login_store'))}</dt><dd>${escapeHtml(state.settings.store)}</dd>
      </dl>
      <button class="btn btn-block" onclick="logout()">${escapeHtml(L('btn_logout'))}</button>
    </div>

    <div class="card">
      <h3>${escapeHtml(L('set_data'))}</h3>
      <div class="row wrap">
        <button class="btn" onclick="exportData()">${escapeHtml(L('set_export'))}</button>
        <button class="btn btn-danger btn-sm" onclick="clearOldData()">${escapeHtml(L('set_clean_old'))}</button>
        <button class="btn btn-danger btn-sm" onclick="clearAllData()">${escapeHtml(L('set_clear_all'))}</button>
      </div>
    </div>

    <div class="card flat" style="background:#f9fafb;">
      <div class="small muted" style="white-space:pre-line;">${escapeHtml(L('set_app_info'))}</div>
    </div>
  `;
}
function saveSettings() {
  state.settings.store = document.getElementById('set-store').value;
  saveState();
  toast(L('toast_saved'), 'success');
  render();
}
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kmocs-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
function clearOldData() {
  if (!confirm(L('confirm_clear_old'))) return;
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-7);
  const cutoffIso = fmtDateISO(cutoff);
  let removed = 0;
  for (const date in state.assignments) {
    if (date < cutoffIso) {
      removed += state.assignments[date].length;
      delete state.assignments[date];
    }
  }
  saveState();
  toast(`${removed}개 정리됨`, 'success');
  render();
}
function clearAllData() {
  if (!confirm(L('confirm_clear_all'))) return;
  if (!confirm(L('confirm_clear_again'))) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY_V1);
  state = defaultState();
  toast(L('toast_deleted'), 'success');
  navigate('login');
}
function clearOldDataConfirmed() {
  // bridge for confirm dialog
}

// ============================================================
//  MANUAL HUB (메인 페이지 6대 부문 카드 + STORE MANAGER REPORT)
// ============================================================

// 매장 × 부문 완성률 (현재 시점 기준 단순)
function getDeptCompletionByStore(date, storeName, deptIds) {
  const tasks = (state.assignments[date] || []).filter(t =>
    t.store === storeName && deptIds.includes(t.department)
  );
  const items = tasks.flatMap(t => t.checklist || []);
  const total = items.length;
  const done = items.filter(i => i.completedAt || i.completed).length;
  return { total, done, pct: total ? Math.round(done / total * 100) : null };
}

function renderManualHub() {
  const lang = state.settings.lang || 'ko';
  const date = todayISO();
  const store = state.settings.store;
  const sh = activeShift();

  const cards = KMOCS_MANUAL_HUB.map(g => {
    const hasManual = g.manuals && g.manuals.length > 0;
    const deptIds = g.deptIds || [];
    // 미완료 항목 수 (현재 매장 + 시프트 + 그 그룹의 부문들)
    const pending = deptIds.reduce((sum, did) => sum + (_pendingByDept[did] || 0), 0);
    const pendingBadge = pending > 0
      ? `<span class="hub-pending-badge" title="${lang==='ko'?'미완료':'Pending'}">${pending}</span>`
      : '';
    const manualBtn = hasManual
      ? `<button class="manual-icon-btn" onclick="event.stopPropagation();navigate('manual-group',{groupId:'${g.id}'})" title="${lang==='ko'?'매뉴얼':'Manual'}">📖</button>`
      : `<span class="manual-icon-btn" style="opacity:0.3;cursor:default">📖</span>`;
    const cardClick = deptIds.length
      ? `onclick="enterDeptStore('${g.id}','${state.settings.store.replace(/'/g, "&#39;")}')"`
      : '';
    const disabledCls = deptIds.length ? '' : 'disabled';

    return `
      <div class="hub-card-simple ${disabledCls}" role="button" tabindex="0" style="border-left:6px solid ${g.color}" ${cardClick}>
        <span class="hub-icon-v2">${g.icon}</span>
        <span class="hub-name-v2">${escapeHtml(g.name[lang] || g.name.en)}</span>
        ${pendingBadge}
        ${manualBtn}
      </div>
    `;
  }).join('');

  return `<div class="manual-hub-simple">${cards}</div>`;
}

function enterDeptStore(groupId, storeName) {
  const g = getManualHubGroup(groupId);
  if (!g || !g.deptIds || g.deptIds.length === 0) {
    toast(state.settings.lang==='ko'?'이 부문에는 task가 없습니다':'No tasks in this group', 'error');
    return;
  }
  if (state.user && state.user.role === 'owner' && storeName !== state.settings.store) {
    state.settings.store = storeName;
    saveState();
    toast(`📍 ${storeName}`, '');
  }
  if (g.deptIds.length === 1) {
    navigate('dept-detail', {deptId: g.deptIds[0]});
  } else {
    navigate('manual-group', {groupId});
  }
}

function viewManualGroup(groupId) {
  const g = getManualHubGroup(groupId);
  if (!g) return '<div class="empty">Group not found</div>';
  const lang = state.settings.lang || 'ko';
  const hasManual = g.manuals && g.manuals.length > 0;

  const manualsHtml = hasManual ? g.manuals.map(key => {
    const url = getManualFile(key, lang);
    return `<a class="manual-mini-link" href="${url}" download>📄 ${key} ⬇</a>`;
  }).join('') : `<span class="muted small">${lang === 'ko' ? '매뉴얼 없음' : lang === 'es' ? 'Sin manual' : 'No manual'}</span>`;

  const deptCards = (g.deptIds || []).map(did => {
    const d = getDept(did);
    if (!d) return '';
    return `
      <button class="dept-card" style="border-color:${d.color}33"
              onclick="navigate('dept-detail',{deptId:'${did}'})">
        <div class="icon-row"><span class="icon">${d.icon}</span></div>
        <div class="dept-name">${escapeHtml(dn(d))}</div>
        <div class="dept-sub">${escapeHtml(ds(d))}</div>
      </button>
    `;
  }).filter(Boolean).join('');

  const langLabel = lang === 'ko' ? '🇰🇷 한국어' : lang === 'es' ? '🇪🇸 Español' : '🇺🇸 English';
  const titleManuals = lang === 'ko' ? '운영 매뉴얼' : lang === 'es' ? 'Manuales' : 'Operations Manuals';
  const titleDepts   = lang === 'ko' ? '연결된 부문' : lang === 'es' ? 'Departamentos' : 'Linked Departments';

  const refLbl = lang === 'ko' ? '참조용' : lang === 'es' ? 'Referencia' : 'Reference';
  return `
    <button class="btn btn-sm" onclick="goBack()">← ${escapeHtml(L('btn_back'))}</button>
    <h2 class="mt-2">${g.icon} ${escapeHtml(g.name[lang] || g.name.en)}</h2>
    <div class="muted small mb-2">${escapeHtml(g.desc[lang] || g.desc.en)}</div>

    ${deptCards ? `
      <div class="card mt-2">
        <h3>${titleDepts}</h3>
        <div class="dept-grid">${deptCards}</div>
      </div>
    ` : ''}

    <div class="manual-ref-strip">
      <span class="manual-ref-strip-label">📎 ${refLbl}</span>
      ${manualsHtml}
    </div>
  `;
}

function viewManagerReport() {
  const lang = state.settings.lang || 'ko';
  const url = getManualFile('MANAGER', lang);

  const t = {
    title:    lang === 'ko' ? '📋 STORE MANAGER REPORT' : lang === 'es' ? '📋 INFORME DEL GERENTE' : '📋 STORE MANAGER REPORT',
    subtitle: lang === 'ko' ? '매니저 데일리 운영 체크리스트 (Phase 1-6)' : lang === 'es' ? 'Lista diaria del gerente (Fase 1-6)' : 'Manager Daily Operations Checklist (Phase 1-6)',
    download: lang === 'ko' ? '📄 매뉴얼 다운로드 (.docx)' : lang === 'es' ? '📄 Descargar manual (.docx)' : '📄 Download manual (.docx)',
    coming:   lang === 'ko' ? '🚧 인앱 데일리 체크 모듈 (Phase 1-6 시간별 체크 + Zone Price + 제출 → 오너 확인) — 다음 단계에서 구현 예정'
            : lang === 'es' ? '🚧 Módulo de chequeo diario en la app — próximamente'
            : '🚧 In-app daily check module (Phase 1-6 timed checks + Zone Price + submit → owner review) — coming next',
    phases:   lang === 'ko' ? '구성 단계' : lang === 'es' ? 'Fases' : 'Phases'
  };

  const phases = [
    ['Phase 1', '7:00 - 8:15 AM',   lang==='ko'?'프리 오프닝 점검':'Pre-opening Inspection'],
    ['Phase 2', '8:00 - 12:00 PM',  lang==='ko'?'오전 운영':'Morning Operations'],
    ['Phase 3', '12:00 - 4:00 PM',  lang==='ko'?'오후 운영':'Afternoon Operations'],
    ['Phase 4', '4:00 - 8:00 PM',   lang==='ko'?'저녁 운영':'Evening Operations'],
    ['Phase 5', '8:00 - 10:05 PM',  lang==='ko'?'클로징 슈퍼비전':'Closing Supervision'],
    ['Phase 6', '10:00 - 10:30 PM', lang==='ko'?'매니저 최종 락다운':'Manager Final Lockdown']
  ].map(([p, time, name]) => `
    <div class="card-row" style="padding:0.5rem 0;border-bottom:1px solid #eee;">
      <div><b>${p}</b> <span class="muted small">${time}</span></div>
      <div>${escapeHtml(name)}</div>
    </div>
  `).join('');

  return `
    <button class="btn btn-sm" onclick="goBack()">← ${escapeHtml(L('btn_back'))}</button>
    <h2 class="mt-2">${t.title}</h2>
    <div class="muted small mb-2">${t.subtitle}</div>

    <div class="card mt-2">
      <h3>${t.phases}</h3>
      ${phases}
    </div>

    <a class="btn btn-primary btn-block btn-lg mt-2" href="${url}" download>${t.download}</a>

    <div class="banner warn mt-2">${t.coming}</div>
  `;
}

// ============================================================
//  완성률 기반 평가 + 보상 (Step 1-4)
// ============================================================

// Step 1: 시간대별 완성률 기반 자동 평가 (9AM 35 + 1PM 25 + 5PM 25 + 사진 10 + 무문제 5)
function evaluateByTimeWindow(taskList, date) {
  if (!taskList || taskList.length === 0) return null;
  const allItems = taskList.flatMap(t => t.checklist || []);
  const total = allItems.length;
  if (total === 0) return null;

  const c9  = cutoffMs(date, 9);
  const c13 = cutoffMs(date, 13);
  const c17 = cutoffMs(date, 17);
  const at9  = allItems.filter(i => i.completedAt && i.completedAt <= c9).length;
  const at13 = allItems.filter(i => i.completedAt && i.completedAt <= c13).length;
  const at17 = allItems.filter(i => i.completedAt && i.completedAt <= c17).length;
  const rate9  = at9  / total;
  const rate13 = at13 / total;
  const rate17 = at17 / total;

  const photoTasks = taskList.filter(t => t.photoRequired);
  const photoSatisfied = photoTasks.filter(t =>
    (t.checklist || []).some(i => i.photos && i.photos.length > 0)
  ).length;
  const photoRate = photoTasks.length ? photoSatisfied / photoTasks.length : 1;

  const issues = allItems.filter(i => i.hasIssue).length;
  const qualityRate = total ? 1 - (issues / total) : 1;

  const score = Math.round(
    rate9 * 35 + rate13 * 25 + rate17 * 25 + photoRate * 10 + qualityRate * 5
  );
  const clamped = Math.max(0, Math.min(100, score));
  return {
    total,
    rate9, rate13, rate17,
    photoRate, qualityRate,
    score: clamped,
    grade: gradeFromScore(clamped),
    breakdown: {
      _9AM:   Math.round(rate9 * 35),
      _1PM:   Math.round(rate13 * 25),
      _5PM:   Math.round(rate17 * 25),
      _PHOTO: Math.round(photoRate * 10),
      _QUAL:  Math.round(qualityRate * 5)
    }
  };
}

// 부문별 평가 (오늘, 매장의 한 부문)
function evaluateDeptByTimeWindow(date, store, deptId) {
  const tasks = (state.assignments[date] || []).filter(t =>
    t.store === store && t.department === deptId
  );
  return evaluateByTimeWindow(tasks, date);
}

// 직원별 평가 (오늘, 매장의 한 직원)
function evaluateEmployeeByTimeWindow(date, store, name) {
  const tasks = (state.assignments[date] || []).filter(t =>
    t.store === store && t.assignedTo && t.assignedTo.name === name
  );
  const ev = evaluateByTimeWindow(tasks, date);
  return { name, count: tasks.length, eval: ev };
}

// Step 4: 오늘 보상 정산 — 직원별 점수 → REWARD_TABLE → state.rewards 누적
function settleRewardsForToday() {
  const date = todayISO();
  const store = state.settings.store;
  const empNames = new Set();
  (state.assignments[date] || []).forEach(t => {
    if (t.store === store && t.assignedTo && t.assignedTo.name) {
      empNames.add(t.assignedTo.name);
    }
  });
  let settled = 0;
  empNames.forEach(name => {
    const r = evaluateEmployeeByTimeWindow(date, store, name);
    if (!r.eval) return;
    getOrCreateReward(store, date, 'daily', name, r.eval.score, r.eval.grade.id);
    settled++;
  });
  saveState();
  return { settled, total: empNames.size };
}

// ============================================================
//  COMPLETION RATE SNAPSHOT (9AM / 1PM / 5PM 자동 완성률 통계)
// ============================================================

const SNAPSHOT_HOURS = [9, 13, 17]; // 9 AM, 1 PM, 5 PM

function snapshotLabel(h, lang) {
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h <= 12 ? h : h - 12;
  return `${h12} ${ampm}`;
}

// date+hour → ms timestamp (해당 날짜의 hour:00:00 로컬 시각)
function cutoffMs(dateISO, hour) {
  const [y, m, d] = dateISO.split('-').map(Number);
  return new Date(y, m - 1, d, hour, 0, 0, 0).getTime();
}

// 부문별 완성률 (cutoff 시각까지 체크된 항목 비율)
function getAchievementByDeptAtCutoff(date, shift, store, hourCutoff) {
  const cutoff = cutoffMs(date, hourCutoff);
  const tasks = (state.assignments[date] || []).filter(t =>
    t.shift === shift && t.store === store
  );
  const byDept = {};
  tasks.forEach(t => {
    if (!byDept[t.department]) byDept[t.department] = { total: 0, done: 0 };
    (t.checklist || []).forEach(it => {
      byDept[t.department].total++;
      if (it.completedAt && it.completedAt <= cutoff) {
        byDept[t.department].done++;
      }
    });
  });
  return byDept;
}

function viewAchievementSnapshot() {
  const date = todayISO();
  const sh = activeShift();
  const store = state.settings.store;
  const lang = state.settings.lang || 'ko';

  const data = SNAPSHOT_HOURS.map(h => ({
    hour: h,
    label: snapshotLabel(h, lang),
    byDept: getAchievementByDeptAtCutoff(date, sh, store, h)
  }));

  const allDeptIds = Array.from(new Set(data.flatMap(d => Object.keys(d.byDept))));

  const t = {
    title:    lang === 'ko' ? '📊 시간대별 부문 완성률' : lang === 'es' ? '📊 Tasa de finalización por departamento' : '📊 Department Completion Rate',
    subtitle: lang === 'ko' ? '9 AM / 1 PM / 5 PM 기준 자동 통계 (각 항목 체크 시각 기준)'
            : lang === 'es' ? '9 AM / 1 PM / 5 PM auto-snapshot (basado en hora de check)'
            : '9 AM / 1 PM / 5 PM auto-snapshot (based on check timestamps)',
    dept:     lang === 'ko' ? '부문' : lang === 'es' ? 'Depto.' : 'Dept',
    nodata:   lang === 'ko' ? '오늘 등록된 업무가 없습니다.' : lang === 'es' ? 'No hay tareas hoy.' : 'No tasks today.',
    legend:   lang === 'ko' ? '🟢 ≥95%   🟡 70-94%   🔴 <70%' : '🟢 ≥95%   🟡 70-94%   🔴 <70%'
  };

  if (allDeptIds.length === 0) {
    return `
      <button class="btn btn-sm" onclick="goBack()">← ${escapeHtml(L('btn_back'))}</button>
      <h2 class="mt-2">${t.title}</h2>
      <div class="muted small mb-2">${t.subtitle}</div>
      <div class="empty"><div class="ico">📭</div><p>${t.nodata}</p></div>
    `;
  }

  // 부문별 평가 (점수/등급/보상)
  const deptEvals = {};
  allDeptIds.forEach(did => {
    deptEvals[did] = evaluateDeptByTimeWindow(date, store, did);
  });

  // 직원별 평가 + 보상 미리보기
  const empNames = new Set();
  (state.assignments[date] || []).forEach(tk => {
    if (tk.store === store && tk.assignedTo && tk.assignedTo.name) empNames.add(tk.assignedTo.name);
  });
  const empEvals = Array.from(empNames).map(name => evaluateEmployeeByTimeWindow(date, store, name))
    .filter(r => r.eval).sort((a,b) => b.eval.score - a.eval.score);

  const tt = {
    score:  lang === 'ko' ? '점수' : lang === 'es' ? 'Puntaje' : 'Score',
    grade:  lang === 'ko' ? '등급' : lang === 'es' ? 'Nivel' : 'Grade',
    reward: lang === 'ko' ? '보상' : lang === 'es' ? 'Reward' : 'Reward',
    empSec: lang === 'ko' ? '👥 직원별 보상 미리보기' : lang === 'es' ? '👥 Vista previa por empleado' : '👥 Per-Employee Reward Preview',
    empCol: lang === 'ko' ? '직원' : lang === 'es' ? 'Empleado' : 'Employee',
    settle: lang === 'ko' ? '💰 오늘 보상 정산 (직원별 누적)' : lang === 'es' ? '💰 Liquidar recompensas de hoy' : '💰 Settle today’s rewards',
    settleHint: lang === 'ko' ? '클릭 시 위 점수에 따라 직원별 보상이 누적됩니다.' : 'Click to accumulate rewards per employee based on scores above.',
    formula: lang === 'ko' ? '점수 = 9AM×35 + 1PM×25 + 5PM×25 + 사진×10 + 무문제×5' : 'Score = 9AM×35 + 1PM×25 + 5PM×25 + Photo×10 + Quality×5',
    noEmp:  lang === 'ko' ? '오늘 등록된 직원이 없습니다.' : 'No employees today.'
  };

  const headerCells = `<th>${t.dept}</th>` + data.map(d => `<th>${d.label}</th>`).join('') + `<th>${tt.score}</th><th>${tt.grade}</th><th>${tt.reward}</th>`;
  const rows = allDeptIds.map(did => {
    const dept = getDept(did);
    const cells = data.map(d => {
      const v = d.byDept[did];
      if (!v || v.total === 0) return '<td><span class="muted">—</span></td>';
      const pct = Math.round(v.done / v.total * 100);
      const cls = pct >= 95 ? 'green' : pct >= 70 ? 'yellow' : 'red';
      return `<td><span class="ach-pill ach-${cls}">${pct}%</span><div class="small muted" style="margin-top:0.2rem;">${v.done}/${v.total}</div></td>`;
    }).join('');
    const ev = deptEvals[did];
    const scoreCell = ev ? `<td><b>${ev.score}</b></td>` : '<td><span class="muted">—</span></td>';
    const gradeCell = ev ? `<td><span class="ach-grade-pill" style="background:${ev.grade.bg};color:${ev.grade.color};">${ev.grade.id.toUpperCase()}</span></td>` : '<td><span class="muted">—</span></td>';
    const rwd = ev ? (REWARD_TABLE[ev.grade.id] || REWARD_TABLE.f) : null;
    const rewardCell = rwd ? `<td><b>$${rwd.cash}</b><div class="small muted">${rwd.points}pt</div></td>` : '<td><span class="muted">—</span></td>';
    const deptIcon = dept ? dept.icon : '📦';
    const deptName = dept ? dn(dept) : did;
    return `<tr><td class="ach-dept-cell"><span class="ach-dept-icon">${deptIcon}</span><b>${escapeHtml(deptName)}</b></td>${cells}${scoreCell}${gradeCell}${rewardCell}</tr>`;
  }).join('');

  // 전체 합계 row (점수/등급/보상은 부문 평균 무의미하므로 비움)
  const totals = data.map(d => {
    let total = 0, done = 0;
    Object.values(d.byDept).forEach(v => { total += v.total; done += v.done; });
    return { total, done, pct: total ? Math.round(done / total * 100) : 0 };
  });
  const totalRow = `<tr class="ach-total-row">
    <td><b>${lang === 'ko' ? '전체' : 'Total'}</b></td>
    ${totals.map(ttv => {
      if (ttv.total === 0) return '<td><span class="muted">—</span></td>';
      const cls = ttv.pct >= 95 ? 'green' : ttv.pct >= 70 ? 'yellow' : 'red';
      return `<td><span class="ach-pill ach-${cls}">${ttv.pct}%</span><div class="small muted" style="margin-top:0.2rem;">${ttv.done}/${ttv.total}</div></td>`;
    }).join('')}
    <td colspan="3"><span class="muted small">${tt.formula}</span></td>
  </tr>`;

  // 직원별 표
  const empRows = empEvals.length === 0 ? `<tr><td colspan="4" class="muted" style="text-align:center;padding:1rem;">${tt.noEmp}</td></tr>`
    : empEvals.map(r => {
        const ev = r.eval;
        const rwd = REWARD_TABLE[ev.grade.id] || REWARD_TABLE.f;
        return `<tr>
          <td><b>${escapeHtml(r.name)}</b><div class="small muted">${r.count} task${r.count===1?'':'s'}</div></td>
          <td><b>${ev.score}</b><div class="small muted">9:${ev.breakdown._9AM} 1:${ev.breakdown._1PM} 5:${ev.breakdown._5PM} 📷:${ev.breakdown._PHOTO} ✓:${ev.breakdown._QUAL}</div></td>
          <td><span class="ach-grade-pill" style="background:${ev.grade.bg};color:${ev.grade.color};">${ev.grade.id.toUpperCase()}</span></td>
          <td><b>$${rwd.cash}</b><div class="small muted">${rwd.points}pt</div></td>
        </tr>`;
      }).join('');

  return `
    <button class="btn btn-sm" onclick="goBack()">← ${escapeHtml(L('btn_back'))}</button>
    <h2 class="mt-2">${t.title}</h2>
    <div class="muted small mb-2">${t.subtitle}</div>
    <div class="muted small mb-2">${escapeHtml(state.settings.store)} · ${fmtDateKor(date)}</div>

    <div class="card">
      <table class="ach-table">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${rows}${totalRow}</tbody>
      </table>
      <div class="small muted" style="margin-top:0.5rem; text-align:center;">${t.legend}</div>
    </div>

    <div class="card mt-2">
      <h3>${tt.empSec}</h3>
      <table class="ach-table">
        <thead><tr><th>${tt.empCol}</th><th>${tt.score}</th><th>${tt.grade}</th><th>${tt.reward}</th></tr></thead>
        <tbody>${empRows}</tbody>
      </table>
      ${empEvals.length > 0 ? `
        <button class="btn btn-success btn-block btn-lg mt-2" onclick="onSettleRewardsClick()">${tt.settle}</button>
        <div class="muted small mt-1" style="text-align:center;">${tt.settleHint}</div>
      ` : ''}
    </div>
  `;
}

function onSettleRewardsClick() {
  const lang = state.settings.lang || 'ko';
  const r = settleRewardsForToday();
  const msg = lang === 'ko' ? `✅ ${r.settled}명 직원 보상 누적 완료`
            : lang === 'es' ? `✅ Recompensas para ${r.settled} empleados`
            : `✅ Settled rewards for ${r.settled} employees`;
  toast(msg, 'success');
  render();
}

// ============================================================
//  부문별 업무왕 (월간 1-3등 + streak 보너스)
// ============================================================

const AWARD_BONUS = { 1: 200, 2: 100, 3: 50, streak: 100 }; // USD

// 월(YYYY-MM)에 해당하는 task들 모음
function getTasksInMonth(month, store, deptId) {
  const result = [];
  Object.keys(state.assignments || {}).forEach(date => {
    if (!date.startsWith(month)) return;
    (state.assignments[date] || []).forEach(t => {
      if (t.store !== store) return;
      if (deptId && t.department !== deptId) return;
      result.push(t);
    });
  });
  return result;
}

// 직원별 부문별 월간 통계
function getEmployeeDeptStats(name, store, deptId, month) {
  if (!name) return null;
  const tasks = getTasksInMonth(month, store, deptId);
  let myItems = 0, myWithPhoto = 0, myOnTime = 0, myFinishes = 0, totalScore = 0;
  tasks.forEach(t => {
    const def = KMOCS.SHIFTS[t.shift];
    const dlMs = def && def.deadlineHour !== undefined
      ? new Date(t.date + 'T' + String(def.deadlineHour).padStart(2,'0') + ':' + String(def.deadlineMin).padStart(2,'0') + ':00').getTime()
      : null;
    (t.checklist || []).forEach(it => {
      if (it.completedByName !== name) return;
      myItems++;
      if (it.photos && it.photos.length > 0) myWithPhoto++;
      if (dlMs && it.completedAt && it.completedAt <= dlMs) myOnTime++;
    });
    if (t.finishedByName === name) myFinishes++;
  });
  // 점수: 항목 1점 + 사진 0.5점 + 데드라인내 0.5점 + 마무리 2점
  totalScore = myItems + (myWithPhoto * 0.5) + (myOnTime * 0.5) + (myFinishes * 2);
  return {
    name,
    store,
    deptId,
    month,
    items: myItems,
    photos: myWithPhoto,
    onTime: myOnTime,
    finishes: myFinishes,
    score: Math.round(totalScore * 10) / 10
  };
}

// 부문별 1-3등 산정 (직원 list)
function rankEmployeesByDept(store, deptId, month) {
  const tasks = getTasksInMonth(month, store, deptId);
  // 활동한 직원 모음
  const names = new Set();
  tasks.forEach(t => {
    (t.checklist || []).forEach(it => { if (it.completedByName) names.add(it.completedByName); });
    if (t.finishedByName) names.add(t.finishedByName);
  });
  const stats = Array.from(names)
    .map(n => getEmployeeDeptStats(n, store, deptId, month))
    .filter(s => s && s.score > 0)
    .sort((a, b) => b.score - a.score);
  return stats.slice(0, 3); // 1-3등
}

// 연속 streak 횟수 (해당 직원이 해당 부문 매장에서 1-3위에 든 연속 월 수)
function getStreakCount(name, store, deptId) {
  let streak = 0;
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const month = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const top3 = rankEmployeesByDept(store, deptId, month);
    if (top3.some(s => s.name === name)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// 보너스 계산 ($200/$100/$50 + streak ≥3 시 +$100)
function calcBonus(rank, streak) {
  const base = AWARD_BONUS[rank] || 0;
  const streakBonus = streak >= 3 ? AWARD_BONUS.streak : 0;
  return { base, streakBonus, total: base + streakBonus };
}

function viewDeptAwards(month) {
  const lang = state.settings.lang || 'ko';
  const store = state.settings.store;
  const m = month || (new Date()).toISOString().slice(0, 7); // YYYY-MM
  const tx = {
    title: lang==='ko'?`🏆 부문별 업무왕 — ${m}`:lang==='es'?`🏆 Empleados Top — ${m}`:`🏆 Department Top Performers — ${m}`,
    sub:   lang==='ko'?`${store} 매장 / 1등 $${AWARD_BONUS[1]} · 2등 $${AWARD_BONUS[2]} · 3등 $${AWARD_BONUS[3]} · 3개월 연속 +$${AWARD_BONUS.streak}`:`${store} / 1st $${AWARD_BONUS[1]} · 2nd $${AWARD_BONUS[2]} · 3rd $${AWARD_BONUS[3]} · 3-mo streak +$${AWARD_BONUS.streak}`,
    noData:lang==='ko'?'활동 없음':'No activity',
    rankTxt: ['🥇', '🥈', '🥉']
  };

  const blocks = KMOCS.DEPARTMENTS.map(d => {
    const top3 = rankEmployeesByDept(store, d.id, m);
    if (top3.length === 0) return '';
    const rows = top3.map((s, i) => {
      const rank = i + 1;
      const streak = getStreakCount(s.name, store, d.id);
      const bn = calcBonus(rank, streak);
      const streakBadge = streak >= 3 ? `<span class="streak-badge">🔥 ${streak}연속 +$${AWARD_BONUS.streak}</span>` : (streak >= 2 ? `<span class="streak-near">${streak}연속</span>` : '');
      return `
        <div class="award-row">
          <span class="award-rank">${tx.rankTxt[i]}</span>
          <div class="award-body">
            <b>${escapeHtml(s.name)}</b>
            ${streakBadge}
            <div class="muted small">항목 ${s.items} · 📷 ${s.photos} · ⏰ ${s.onTime} · 🏁 ${s.finishes}</div>
          </div>
          <div class="award-bonus">
            <b>$${bn.total}</b>
            ${bn.streakBonus > 0 ? `<div class="muted small">$${bn.base}+$${bn.streakBonus}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
    return `
      <div class="card mt-2">
        <h3>${d.icon} ${escapeHtml(dn(d))}</h3>
        ${rows}
      </div>
    `;
  }).filter(Boolean).join('');

  return `
    <button class="btn btn-sm" onclick="goBack()">← ${escapeHtml(L('btn_back'))}</button>
    <h2 class="mt-2">${tx.title}</h2>
    <div class="muted small mb-2">${tx.sub}</div>
    ${blocks || `<div class="empty"><div class="ico">📭</div><p>${tx.noData}</p></div>`}
  `;
}

// ============================================================
//  Employee of the Month (매장별 1명) — 추천 기반 + 자동 점수 참고
//  보너스 $300 / 추천 마감: 매달 말일 -3일
//  추천 권한: manager / asst_manager / supervisor / asst_supervisor
//  평가 요소(정성): 신규 메뉴 개발, 타 지점 교류, 신규 직원 교육,
//                   멤버 관계, 근속, 업무 성과
// ============================================================

const EOM_BONUS = 300;
const EOM_NOMINATOR_ROLES = ['manager', 'asst_manager', 'supervisor', 'asst_supervisor'];

// 그 달의 추천 마감 (말일 - 3일) 23:59:59
function getEOMDeadline(month) {
  // month = 'YYYY-MM'
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate(); // 그 달 마지막 날짜
  const dlDate = new Date(y, m - 1, lastDay - 3, 23, 59, 59, 999);
  return dlDate.getTime();
}

function isEOMNominationOpen(month) {
  return Date.now() <= getEOMDeadline(month);
}

function getEOMNominations(month, store) {
  state.eomNominations = state.eomNominations || {};
  const key = month + '|' + store;
  return state.eomNominations[key] || [];
}

function addEOMNomination(month, store, recommendee, reason) {
  if (!isEOMNominationOpen(month)) return { ok: false, error: 'closed' };
  if (!recommendee) return { ok: false, error: 'no_recommendee' };
  const role = state.user && getRole(state.user.role);
  const isOwner = state.user?.role === 'owner';
  if (!isOwner && (!role || !EOM_NOMINATOR_ROLES.includes(state.user?.role))) {
    return { ok: false, error: 'no_permission' };
  }
  state.eomNominations = state.eomNominations || {};
  const key = month + '|' + store;
  const list = state.eomNominations[key] || (state.eomNominations[key] = []);
  // 1인 1추천 (같은 추천자가 같은 달 중복 추천 시 갱신)
  const myName = state.settings.myName || state.user?.name || '익명';
  const existing = list.findIndex(n => n.recommender === myName);
  const entry = {
    id: 'nom' + Date.now(),
    recommender: myName,
    recommenderRole: state.user?.role,
    recommendee,
    reason: (reason || '').trim(),
    ts: Date.now()
  };
  if (existing >= 0) list[existing] = entry;
  else list.push(entry);
  saveState();
  return { ok: true };
}

function tallyEOMVotes(month, store) {
  const noms = getEOMNominations(month, store);
  const tally = {};
  noms.forEach(n => {
    if (!tally[n.recommendee]) tally[n.recommendee] = { name: n.recommendee, votes: 0, reasons: [] };
    tally[n.recommendee].votes++;
    if (n.reason) tally[n.recommendee].reasons.push({ by: n.recommender, role: n.recommenderRole, reason: n.reason });
  });
  return Object.values(tally).sort((a, b) => b.votes - a.votes);
}

function getEOMCandidates(store, month) {
  // 매장의 모든 활동 직원 모음
  const tasks = getTasksInMonth(month, store);
  const names = new Set();
  tasks.forEach(t => {
    (t.checklist || []).forEach(it => { if (it.completedByName) names.add(it.completedByName); });
    if (t.finishedByName) names.add(t.finishedByName);
  });
  // 각 직원의 부문별 점수 모음
  const candidates = [];
  names.forEach(name => {
    const deptStats = KMOCS.DEPARTMENTS
      .map(d => getEmployeeDeptStats(name, store, d.id, month))
      .filter(s => s && s.score > 0);
    if (deptStats.length === 0) return;
    const avgScore = deptStats.reduce((a, s) => a + s.score, 0) / deptStats.length;
    const diversity = deptStats.length; // 기여 부문 수
    const diversityMultiplier = 1 + (diversity - 1) * 0.15; // 1부문 1.0 / 2부문 1.15 / 3부문 1.30 ...
    const finalScore = Math.round(avgScore * diversityMultiplier * 10) / 10;
    candidates.push({
      name, store, month,
      deptCount: diversity,
      avgScore: Math.round(avgScore * 10) / 10,
      diversityMultiplier: Math.round(diversityMultiplier * 100) / 100,
      finalScore,
      depts: deptStats.map(s => ({ deptId: s.deptId, score: s.score }))
    });
  });
  candidates.sort((a, b) => b.finalScore - a.finalScore);
  return candidates;
}

function viewEOM(month) {
  const lang = state.settings.lang || 'ko';
  const store = state.settings.store;
  const m = month || (new Date()).toISOString().slice(0, 7);
  const dl = getEOMDeadline(m);
  const open = isEOMNominationOpen(m);
  const role = state.user && getRole(state.user.role);
  const canNominate = state.user?.role === 'owner' || EOM_NOMINATOR_ROLES.includes(state.user?.role);
  const myName = state.settings.myName || state.user?.name || '';
  const myExisting = getEOMNominations(m, store).find(n => n.recommender === myName);

  const tx = {
    title: `🌟 Employee of the Month — ${m}`,
    sub:   `${store} · 보너스 $${EOM_BONUS} · 추천 마감 ${fmtDateTime(dl)}`,
    sectionVotes: lang==='ko'?'📊 추천 투표 현황':'📊 Nominations',
    sectionAuto:  lang==='ko'?'📈 자동 점수 (참고)':'📈 Auto score (reference)',
    sectionForm:  lang==='ko'?'✍️ 내 추천':'✍️ My nomination',
    closed: lang==='ko'?'🔒 추천 마감됨':'🔒 Nominations closed',
    open:   lang==='ko'?`⏳ 추천 가능 (${Math.ceil((dl - Date.now())/(86400000))}일 남음)`:`⏳ Open`,
    noVotes: lang==='ko'?'아직 추천 없음':'No nominations yet',
    noAuto: lang==='ko'?'활동 없음':'No activity',
    pickPh: lang==='ko'?'추천할 직원 이름':'Employee name',
    reasonPh: lang==='ko'?'추천 이유 (신규 메뉴 개발, 타 지점 교류, 신규 직원 교육, 멤버 관계, 근속 등)':'Reason',
    submit: lang==='ko'?'추천 보내기':'Submit nomination',
    update: lang==='ko'?'내 추천 수정':'Update my nomination',
    nominateBy: lang==='ko'?'추천 권한: 매니저 / 어시스턴트 매니저 / 수퍼바이저 / 어시스턴트 수퍼바이저 / 오너':'Nominators: managers + supervisors',
    cantNom: lang==='ko'?'추천 권한이 없습니다':'No permission to nominate',
    deptCount:lang==='ko'?'기여 부문':'Depts',
    avgScore:lang==='ko'?'평균 점수':'Avg',
    multi:lang==='ko'?'다양성':'Diversity'
  };

  // 추천 투표 결과
  const tally = tallyEOMVotes(m, store);
  const winner = tally[0];
  const winnerHtml = winner && !open ? `
    <div class="eom-winner">
      <div class="eom-crown">👑</div>
      <h3 class="eom-name">${escapeHtml(winner.name)}</h3>
      <div class="eom-bonus">$${EOM_BONUS}</div>
      <div class="muted small">${winner.votes} ${lang==='ko'?'표':'votes'}</div>
    </div>
  ` : '';

  const votesHtml = tally.length === 0
    ? `<div class="muted small" style="padding:0.5rem;">${tx.noVotes}</div>`
    : tally.map((t, i) => `
        <div class="award-row">
          <span class="award-rank">${['🥇','🥈','🥉'][i] || (i+1)}</span>
          <div class="award-body">
            <b>${escapeHtml(t.name)}</b> <span class="muted small">${t.votes}${lang==='ko'?'표':' votes'}</span>
            ${t.reasons.length > 0 ? `<div class="muted small" style="margin-top:0.2rem;">${t.reasons.slice(0,3).map(r=>`<div>· "${escapeHtml(r.reason||'-')}" — ${escapeHtml(r.by)}</div>`).join('')}</div>` : ''}
          </div>
          <div class="award-bonus">${i===0 && !open ? '$' + EOM_BONUS : ''}</div>
        </div>
      `).join('');

  // 자동 점수 (참고)
  const autoCands = getEOMCandidates(store, m).slice(0, 5);
  const autoHtml = autoCands.length === 0
    ? `<div class="muted small" style="padding:0.5rem;">${tx.noAuto}</div>`
    : autoCands.map((c, i) => `
        <div class="award-row">
          <span class="award-rank">${i+1}</span>
          <div class="award-body">
            <b>${escapeHtml(c.name)}</b>
            <div class="muted small">${tx.deptCount} ${c.deptCount} · ${tx.avgScore} ${c.avgScore} · ×${c.diversityMultiplier}</div>
          </div>
          <div class="award-bonus muted">${c.finalScore}</div>
        </div>
      `).join('');

  // 추천 폼
  let formHtml = '';
  if (!canNominate) {
    formHtml = `<div class="muted small" style="padding:0.5rem;">${tx.cantNom}</div>`;
  } else if (!open) {
    formHtml = `<div class="muted small" style="padding:0.5rem;">${tx.closed}</div>`;
  } else {
    formHtml = `
      <div class="muted small mb-1">${tx.nominateBy}</div>
      ${myExisting ? `<div class="muted small mb-1">✓ ${lang==='ko'?'현재 추천':'Current'}: <b>${escapeHtml(myExisting.recommendee)}</b></div>` : ''}
      <input id="eom-pick" class="input" placeholder="${tx.pickPh}" value="${myExisting?escapeHtml(myExisting.recommendee):''}">
      <textarea id="eom-reason" class="textarea mt-1" rows="3" placeholder="${tx.reasonPh}">${myExisting?escapeHtml(myExisting.reason||''):''}</textarea>
      <button class="btn btn-primary btn-block btn-lg mt-1" onclick="submitEOMNomination('${m}')">${myExisting?tx.update:tx.submit}</button>
    `;
  }

  return `
    <button class="btn btn-sm" onclick="goBack()">← ${escapeHtml(L('btn_back'))}</button>
    <h2 class="mt-2">${tx.title}</h2>
    <div class="muted small mb-2">${tx.sub}</div>
    <div class="${open?'eom-status-open':'eom-status-closed'}">${open?tx.open:tx.closed}</div>

    ${winnerHtml}

    <div class="card mt-2">
      <h3>${tx.sectionVotes}</h3>
      ${votesHtml}
    </div>

    <div class="card mt-2">
      <h3>${tx.sectionForm}</h3>
      ${formHtml}
    </div>

    <div class="card mt-2 manual-ref-card-eom">
      <h4 style="margin:0 0 0.5rem;font-size:0.85rem;color:#6b7280;">${tx.sectionAuto}</h4>
      ${autoHtml}
    </div>
  `;
}

function submitEOMNomination(month) {
  const pick = (document.getElementById('eom-pick')||{}).value || '';
  const reason = (document.getElementById('eom-reason')||{}).value || '';
  const r = addEOMNomination(month, state.settings.store, pick.trim(), reason);
  const lang = state.settings.lang || 'ko';
  if (!r.ok) {
    const msgs = {
      closed: lang==='ko'?'추천 마감됨':'Closed',
      no_recommendee: lang==='ko'?'추천할 직원 이름을 입력하세요':'Enter employee name',
      no_permission: lang==='ko'?'추천 권한이 없습니다':'No permission'
    };
    toast(msgs[r.error] || 'Error', 'error');
    return;
  }
  toast(lang==='ko'?'✅ 추천 완료':'✅ Nominated', 'success');
  render();
}

// ============================================================
//  오너 모니터링 (A형: 6 매장 카드 아코디언)
// ============================================================

let _ownerExpandedStore = null;

function getStoreSummary(date, storeName) {
  const tasks = (state.assignments[date] || []).filter(t => t.store === storeName);
  const allItems = tasks.flatMap(t => t.checklist || []);
  const total = allItems.length;
  const done = allItems.filter(i => i.completedAt).length;
  let photoCount = 0;
  allItems.forEach(it => {
    if (it.photos && it.photos.length) photoCount += it.photos.length;
    if (it.messages) photoCount += it.messages.filter(m => m.photo).length;
  });
  const issues = allItems.filter(i => i.hasIssue).length;
  const extras = allItems.filter(i => i.isExtra).length;
  return { total, done, photoCount, issues, extras, taskCount: tasks.length };
}

function getStoreDeptBreakdown(date, storeName) {
  const tasks = (state.assignments[date] || []).filter(t => t.store === storeName);
  const byDept = {};
  KMOCS.DEPARTMENTS.forEach(d => { byDept[d.id] = { dept: d, items: [], extras: [] }; });
  tasks.forEach(t => {
    if (!byDept[t.department]) return;
    (t.checklist || []).forEach(it => {
      if (it.isExtra) byDept[t.department].extras.push({ ...it, taskId: t.id });
      else byDept[t.department].items.push({ ...it, taskId: t.id });
    });
  });
  return byDept;
}

function viewOwnerOverview() {
  const date = todayISO();
  const lang = state.settings.lang || 'ko';
  const stores = KMOCS.STORES;

  const tt = {
    title:      lang==='ko'?'📊 오늘 보고 확인':lang==='es'?'📊 Reporte de hoy':'📊 Today’s Report',
    noActivity: lang==='ko'?'시작 전':lang==='es'?'Sin actividad':'No activity',
    noDept:     lang==='ko'?'배정된 부문 없음':'No depts'
  };

  const cards = stores.map(sname => {
    const code = (KMOCS.STORE_CODES && KMOCS.STORE_CODES[sname]) || { code: sname.charAt(0), color: '#9ca3af' };
    const s = getStoreSummary(date, sname);
    const isExpanded = _ownerExpandedStore === sname;
    const isMy = sname === state.settings.store;
    const empty = s.total === 0;
    const pct = s.total ? Math.round(s.done / s.total * 100) : null;
    const status = empty ? 'empty' : pct === 100 ? 'done' : pct > 0 ? 'progress' : 'todo';

    const summary = empty
      ? `<span class="muted">${tt.noActivity}</span>`
      : `<span>📋 ${s.total}</span><span>✓ ${s.done}</span><span>📷 ${s.photoCount}</span>${s.issues?`<span class="overview-issue">⚠ ${s.issues}</span>`:''}${s.extras?`<span class="overview-extras-pill">📝 ${s.extras}</span>`:''}`;

    let breakdown = '';
    if (isExpanded && !empty) {
      const by = getStoreDeptBreakdown(date, sname);
      const lines = KMOCS.DEPARTMENTS.filter(d => (by[d.id]?.items.length || 0) + (by[d.id]?.extras.length || 0) > 0).map(d => {
        const data = by[d.id];
        const totalItems = data.items.length + data.extras.length;
        const doneItems = [...data.items, ...data.extras].filter(i => i.completedAt).length;
        const dpct = totalItems ? Math.round(doneItems/totalItems*100) : 0;
        const cls = dpct >= 100 ? 'green' : dpct >= 50 ? 'yellow' : 'red';
        return `
          <div class="overview-dept-row" onclick="event.stopPropagation();ownerEnterDeptStore('${sname.replace(/'/g, "&#39;")}','${d.id}')">
            <span class="overview-dept-name">${d.icon} ${escapeHtml(dn(d))}</span>
            <span class="ach-pill ach-${cls}">${dpct}%</span>
            <span class="muted small">${doneItems}/${totalItems}</span>
            ${data.extras.length ? `<span class="overview-extras-pill">📝 ${data.extras.length}</span>` : ''}
          </div>
        `;
      }).join('');
      breakdown = `<div class="overview-breakdown">${lines || `<div class="muted small" style="padding:0.5rem;">${tt.noDept}</div>`}</div>`;
    }

    return `
      <div class="overview-card overview-${status} ${isMy?'mine':''}" onclick="ownerToggleStore('${sname.replace(/'/g, "&#39;")}')">
        <div class="overview-card-head">
          <span class="overview-store-pill" style="background:${code.color}">${code.code}</span>
          <span class="overview-store-name">${escapeHtml(sname)}</span>
          ${pct !== null ? `<span class="ach-pill ach-${pct>=100?'green':pct>=70?'yellow':'red'}">${pct}%</span>` : ''}
          <span class="overview-arrow">${isExpanded?'▾':'▸'}</span>
        </div>
        <div class="overview-summary">${summary}</div>
        ${breakdown}
      </div>
    `;
  }).join('');

  return `
    <h2>${tt.title}</h2>
    <div class="muted small mb-2">${fmtDateKor(date)}</div>
    <div class="overview-list">${cards}</div>
  `;
}

function viewAwards() {
  const lang = state.settings.lang || 'ko';
  const tx = {
    title: lang==='ko'?'🏆 어워드':lang==='es'?'🏆 Premios':'🏆 Awards',
    sub:   lang==='ko'?'월간 직원 어워드 — 부문별 업무왕 + 이달의 직원':lang==='es'?'Premios mensuales':'Monthly employee awards',
    dept_t: lang==='ko'?'부문별 업무왕':lang==='es'?'Top por Departamento':'Department Top',
    dept_d: lang==='ko'?`매월 부문별 1-3등 자동 산정 ($${AWARD_BONUS[1]} / $${AWARD_BONUS[2]} / $${AWARD_BONUS[3]} · 3개월 연속 +$${AWARD_BONUS.streak})`:`Monthly 1st/2nd/3rd auto`,
    eom_t:  lang==='ko'?'Employee of the Month':'Employee of the Month',
    eom_d:  lang==='ko'?`매장별 1명 — 관리자 추천 투표 ($${EOM_BONUS} · 마감: 매월 말일 -3일)`:`Store 1st — manager nomination`
  };
  return `
    <h2>${tx.title}</h2>
    <div class="muted small mb-2">${tx.sub}</div>
    <div class="award-entry-row" style="grid-template-columns:1fr;">
      <button class="award-entry-btn dept" onclick="navigate('dept-awards')">
        <span class="award-icon">🏆</span>
        <div>
          <div class="award-title">${tx.dept_t}</div>
          <div class="award-desc">${tx.dept_d}</div>
        </div>
      </button>
      <button class="award-entry-btn eom" onclick="navigate('eom')">
        <span class="award-icon">🌟</span>
        <div>
          <div class="award-title">${tx.eom_t}</div>
          <div class="award-desc">${tx.eom_d}</div>
        </div>
      </button>
    </div>
  `;
}

function ownerToggleStore(name) {
  _ownerExpandedStore = (_ownerExpandedStore === name) ? null : name;
  render();
}

function ownerEnterDeptStore(storeName, deptId) {
  state.settings.store = storeName;
  saveState();
  navigate('dept-detail', {deptId});
}

// ===== INIT =====
// 30일 이상 된 데이터 자동 삭제 (assignments / notices / freeReports / rewards)
function cleanupOldData() {
  const cutoffMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const cutoffDate = fmtDateISO(new Date(cutoffMs));
  let removed = 0;

  if (state.assignments) {
    Object.keys(state.assignments).forEach(date => {
      if (date < cutoffDate) {
        removed += (state.assignments[date] || []).length;
        delete state.assignments[date];
      }
    });
  }
  if (Array.isArray(state.notices)) {
    const before = state.notices.length;
    state.notices = state.notices.filter(n => (n.createdAt || 0) >= cutoffMs);
    removed += before - state.notices.length;
  }
  if (Array.isArray(state.freeReports)) {
    const before = state.freeReports.length;
    state.freeReports = state.freeReports.filter(r => (r.createdAt || 0) >= cutoffMs);
    removed += before - state.freeReports.length;
  }
  if (Array.isArray(state.rewards)) {
    const before = state.rewards.length;
    state.rewards = state.rewards.filter(r => {
      // r.date가 있으면 날짜 비교, 없으면 ts
      if (r.date) return r.date >= cutoffDate;
      return (r.ts || 0) >= cutoffMs;
    });
    removed += before - state.rewards.length;
  }
  if (Array.isArray(state.ownerEvaluations)) {
    const before = state.ownerEvaluations.length;
    state.ownerEvaluations = state.ownerEvaluations.filter(e => {
      if (e.date) return e.date >= cutoffDate;
      return (e.ts || 0) >= cutoffMs;
    });
    removed += before - state.ownerEvaluations.length;
  }

  if (removed > 0) {
    saveState();
    console.log(`[cleanup] removed ${removed} old items (>30 days)`);
  }
  return removed;
}

// 어제 미완료 (스페셜 노트) 항목을 오늘로 자동 이동
// - 공통 체크포인트는 매일 새로 생성되므로 carryover 불필요
// - 매니저가 어제 추가한 스페셜 노트(isExtra) 중 미완료만 carryover
function carryOverPendingFromYesterday() {
  const today = todayISO();
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yest = fmtDateISO(y);
  const yestTasks = state.assignments[yest] || [];
  if (yestTasks.length === 0) return 0;

  let carried = 0;
  yestTasks.forEach(yt => {
    if (yt.kind !== 'daily') return;
    const pendingExtras = (yt.checklist || []).filter(it => it.isExtra && !it.completedAt);
    if (pendingExtras.length === 0) return;

    // 오늘 동일 매장/부문/시프트 task 찾기 또는 생성
    const all = state.assignments[today] || (state.assignments[today] = []);
    let tt = all.find(x => x.store === yt.store && x.department === yt.department && x.shift === yt.shift && x.kind === 'daily');
    if (!tt) {
      tt = ensureDailyDeptTask(today, yt.store, yt.department, yt.shift);
    }
    pendingExtras.forEach(it => {
      // 중복 방지 (이미 carryover된 것은 건너뜀)
      if ((tt.checklist || []).some(x => x.carriedFrom === it.id)) return;
      tt.checklist.push({
        ...it,
        id: 'cy' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
        carriedFrom: it.id,
        carriedFromDate: yest,
        completed: false,
        completedAt: null,
        completedByName: '',
        messages: it.messages ? [
          ...it.messages,
          { id: 'mcy' + Date.now(), by: 'system', byName: '시스템', text: `📅 ${yest}에서 이월됨`, photo: null, ts: Date.now() }
        ] : null
      });
      carried++;
    });
  });
  if (carried > 0) saveState();
  return carried;
}

async function init() {
  cleanupOldData();
  carryOverPendingFromYesterday();
  // 로그인 페이지 폐지 — 자동 default user (owner) 진입.
  // 디바이스가 매장에 고정되어 있다고 가정. 매장은 헤더 드롭다운에서 변경.
  // 직원 이름은 첫 진입 시 모달로 입력 (state.settings.myName).
  if (!state.user) {
    state.user = { name: '👤', role: 'owner' };
    if (!state.staff.some(s => s.name === '👤')) {
      state.staff.push({ id: uid(), name: '👤', role: 'owner' });
    }
    saveState();
  }
  // 첫 진입 시 본인 이름 입력 강제
  if (!state.settings.myName) {
    setTimeout(() => openNameModal(), 400);
  }

  // ===== Firebase 동기화 초기화 =====
  if (window.KMOCS_FB) {
    try {
      KMOCS_FB.init();
      if (KMOCS_FB.isInitialized()) {
        // 1) 원격 상태 1회 fetch — 다른 기기에서 갱신된 데이터 있으면 받아옴
        const remote = await KMOCS_FB.fetchStateOnce();
        if (remote && remote.version) {
          state = mergeRemoteWithLocalPhotos(remote, state);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } else {
          // 처음이면 로컬을 원격에 푸시
          KMOCS_FB.pushState(state);
        }
        // 2) 실시간 구독 — 다른 기기 변경이 푸시되면 자동 머지+재렌더
        KMOCS_FB.subscribeState((rstate, meta) => {
          const newState = mergeRemoteWithLocalPhotos(rstate, state);
          state = newState;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
          if (typeof render === 'function') render();
          if (typeof toast === 'function') {
            const by = (meta && meta.updatedBy) || '다른 기기';
            toast('🔄 ' + by + ' 변경 동기화', 'info');
          }
        });
        KMOCS_FB.markReady();
        console.log('[KMOCS] Firebase 동기화 활성');
      }
    } catch (e) {
      console.warn('[KMOCS] Firebase 동기화 초기화 실패 — 로컬만 동작', e);
    }
  }

  navigate('manager-dashboard');
}
document.addEventListener('DOMContentLoaded', init);
