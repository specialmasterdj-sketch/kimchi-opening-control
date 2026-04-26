# 다음 세션 시작 안내 (사무실 PC에서)

**상태:** Firebase 백엔드 통합 Phase 1 코드 작성 완료. 검증 미완.

## 즉시 해야 할 것

```bash
cd "C:\Users\<사무실 사용자>\OneDrive\Desktop\kimchi-opening-control"
py -m http.server 8005
```

브라우저 두 개 탭에서 `http://localhost:8005` 열고:
1. 콘솔 (F12) 에러 0건 확인
2. 한 탭에서 부문 카드 체크 → 다른 탭에 1-2초 뒤 자동 반영되는지 확인
3. Firebase 콘솔(https://console.firebase.google.com/project/kimchi-opcontrol/firestore) 에 `appState/main` 문서 생성 확인
4. 토스트 "🔄 ... 변경 동기화" 노출 확인

## 변경된 파일 (2026-04-26)

- `firebase.js` (신규) — `window.KMOCS_FB` 동기화 모듈
- `index.html` — Firebase 10.13.0 compat SDK CDN 추가
- `app.js` — `saveState()` Firestore 푸시, `init()` async + fetch + subscribe, `mergeRemoteWithLocalPhotos()` 헬퍼

## Firebase 프로젝트 정보

- 프로젝트 ID: `kimchi-opcontrol`
- 콘솔: https://console.firebase.google.com/project/kimchi-opcontrol
- 플랜: Blaze (Pay-as-you-go) — 예산 알림 $30/월
- Firestore: `nam5 (us-central)`, 테스트 모드, ⚠️ **2026-05-26 만료**
- Storage: `US-EAST1`, 테스트 모드, ⚠️ **2026-05-26 만료**

## 검증 후 다음 단계 (Phase 2)

1. `app.js`의 `addPhoto()` / `addNoticePhoto()` / `addReportPhoto()` 함수 수정
   - 현재: base64 캡처 → state에 저장
   - 변경: base64 캡처 → `KMOCS_FB.uploadPhoto()` → URL 받아 state에 저장
2. 사진 표시 로직: URL이면 `<img src=URL>`, base64면 그대로 (호환성)

## 데드라인 ⚠️

**2026-05-26까지** Firestore + Storage 보안 규칙 강화 (인증 추가) 필수. 안 하면 그 후 모든 읽기/쓰기 차단.

## Claude에게 시작 메시지

> "kimchi-opcontrol Firebase 통합 검증 시작. py -m http.server 8005 켜고 두 탭에서 동기화 확인."
