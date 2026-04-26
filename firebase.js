// ============================================================
// Kimchi Opening Control — Firebase 통합 레이어
// 김치마트 오프닝 컨트롤 - Firebase 동기화 레이어
// ============================================================
// 사용: window.KMOCS_FB.init(); KMOCS_FB.subscribeState(cb); KMOCS_FB.pushState(state);
// 의존: firebase-app-compat, firebase-firestore-compat, firebase-storage-compat (index.html에 로드됨)

(function () {
  'use strict';

  const firebaseConfig = {
    apiKey: "AIzaSyCAi1yVxmOWH2yEk8Ig9SVoGS4y8q4r0Hw",
    authDomain: "kimchi-opcontrol.firebaseapp.com",
    projectId: "kimchi-opcontrol",
    storageBucket: "kimchi-opcontrol.firebasestorage.app",
    messagingSenderId: "8021507252",
    appId: "1:8021507252:web:9946b9ec3d3a003ae3ebe1"
  };

  const STATE_DOC_PATH = ['appState', 'main'];
  const PUSH_DEBOUNCE_MS = 1500;

  let _initialized = false;
  let _db = null;
  let _storage = null;
  let _pushTimer = null;
  let _lastPushedJson = null;
  let _suppressNextRemote = false;
  let _ready = false;
  let _onReadyCallbacks = [];

  function init() {
    if (_initialized) return;
    if (typeof firebase === 'undefined') {
      console.error('[KMOCS_FB] Firebase SDK가 로드되지 않았습니다. index.html 확인.');
      return;
    }
    try {
      firebase.initializeApp(firebaseConfig);
      _db = firebase.firestore();
      _storage = firebase.storage();
      _initialized = true;
      console.log('[KMOCS_FB] Firebase 초기화 완료 — project:', firebaseConfig.projectId);
    } catch (e) {
      console.error('[KMOCS_FB] init 실패', e);
    }
  }

  // 사진(base64 dataURL) 제거 — Firestore 1MB 문서 제한 회피.
  // 사진은 별도 Storage 업로드 후 URL로만 보존 (uploadPhoto 참조).
  function stripBase64Photos(state) {
    const clone = JSON.parse(JSON.stringify(state));
    function clean(obj) {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) { obj.forEach(clean); return; }
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (typeof v === 'string' && v.startsWith('data:image/') && v.length > 2000) {
          obj[k] = '__local_only__';
        } else if (typeof v === 'object') {
          clean(v);
        }
      }
    }
    clean(clone);
    return clone;
  }

  // 디바운스된 Firestore 쓰기. 짧은 시간 내 다발 saveState() 합치기.
  function pushState(state) {
    if (!_initialized) return;
    if (_pushTimer) clearTimeout(_pushTimer);
    _pushTimer = setTimeout(async () => {
      _pushTimer = null;
      try {
        const stripped = stripBase64Photos(state);
        const json = JSON.stringify(stripped);
        if (json === _lastPushedJson) return;
        _lastPushedJson = json;
        _suppressNextRemote = true;
        await _db.collection(STATE_DOC_PATH[0]).doc(STATE_DOC_PATH[1]).set({
          state: stripped,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy: (state.user && state.user.name) || 'unknown',
          clientId: getClientId()
        });
      } catch (e) {
        console.warn('[KMOCS_FB] pushState 실패', e);
      }
    }, PUSH_DEBOUNCE_MS);
  }

  // 즉시 1회성 fetch (앱 첫 진입).
  async function fetchStateOnce() {
    if (!_initialized) return null;
    try {
      const snap = await _db.collection(STATE_DOC_PATH[0]).doc(STATE_DOC_PATH[1]).get();
      if (snap.exists) {
        const data = snap.data();
        return data.state || null;
      }
    } catch (e) {
      console.warn('[KMOCS_FB] fetchStateOnce 실패', e);
    }
    return null;
  }

  // 실시간 구독 — 다른 디바이스가 쓴 변경을 콜백으로 전달.
  function subscribeState(callback) {
    if (!_initialized) return () => {};
    return _db.collection(STATE_DOC_PATH[0]).doc(STATE_DOC_PATH[1]).onSnapshot(snap => {
      if (!snap.exists) return;
      const data = snap.data();
      // 로컬 인의 푸시가 자기 자신에게 다시 들어오는 echo 무시
      if (_suppressNextRemote && data.clientId === getClientId()) {
        _suppressNextRemote = false;
        return;
      }
      _suppressNextRemote = false;
      if (data.state) {
        _lastPushedJson = JSON.stringify(stripBase64Photos(data.state));
        callback(data.state, data);
      }
    }, err => {
      console.warn('[KMOCS_FB] onSnapshot 오류', err);
    });
  }

  // 사진 업로드 — File 또는 base64 dataURL 받아 Storage에 저장 후 다운로드 URL 반환.
  async function uploadPhoto(input, pathPrefix) {
    if (!_initialized) return null;
    try {
      const path = (pathPrefix || 'photos') + '/' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.jpg';
      const ref = _storage.ref(path);
      let snap;
      if (input instanceof File || input instanceof Blob) {
        snap = await ref.put(input);
      } else if (typeof input === 'string' && input.startsWith('data:')) {
        snap = await ref.putString(input, 'data_url');
      } else {
        throw new Error('uploadPhoto: 지원하지 않는 입력');
      }
      return await snap.ref.getDownloadURL();
    } catch (e) {
      console.warn('[KMOCS_FB] uploadPhoto 실패', e);
      return null;
    }
  }

  // 클라이언트 식별자 (echo suppression용)
  function getClientId() {
    let id = localStorage.getItem('kmocs.clientId');
    if (!id) {
      id = 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('kmocs.clientId', id);
    }
    return id;
  }

  function onReady(cb) {
    if (_ready) cb();
    else _onReadyCallbacks.push(cb);
  }

  function markReady() {
    _ready = true;
    _onReadyCallbacks.splice(0).forEach(cb => { try { cb(); } catch (e) {} });
  }

  window.KMOCS_FB = {
    init,
    pushState,
    fetchStateOnce,
    subscribeState,
    uploadPhoto,
    getClientId,
    onReady,
    markReady,
    isInitialized: () => _initialized,
    config: firebaseConfig
  };
})();
