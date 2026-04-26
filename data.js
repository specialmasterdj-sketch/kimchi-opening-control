// ============================================================
// Kimchi Mart Opening / Closing Control System
// 김치마트 오프닝 / 클로징 컨트롤 시스템 - 데이터 정의
// ============================================================

const KMOCS = {

  // ----- 매장 (6개 지점) — 약자(code)로 한 화면 비교 -----
  STORES: [
    'Miami',
    'Pembroke Pines',
    'Hollywood',
    'Coral Springs',
    'Las Olas',
    'West Palm Beach'
  ],
  STORE_CODES: {
    'Miami':           { code: 'M', color: '#dc2626' },
    'Pembroke Pines':  { code: 'P', color: '#ea580c' },
    'Hollywood':       { code: 'H', color: '#d97706' },
    'Coral Springs':   { code: 'C', color: '#16a34a' },
    'Las Olas':        { code: 'L', color: '#2563eb' },
    'West Palm Beach': { code: 'W', color: '#7c3aed' }
  },

  // ----- 언어 -----
  LANGS: [
    { id: 'ko', name: '한국어', short: 'KO', flag: '🇰🇷' },
    { id: 'en', name: 'English', short: 'EN', flag: '🇺🇸' },
    { id: 'es', name: 'Español', short: 'ES', flag: '🇪🇸' }
  ],

  // ----- 공지 카테고리 -----
  NOTICE_KINDS: [
    { id: 'all',     label: { ko: '전체 공지', en: 'All Stores', es: 'Todas las Tiendas' }, icon: '📢', color: '#dc2626' },
    { id: 'store',   label: { ko: '지점 공지', en: 'Store Notice', es: 'Aviso de Tienda' }, icon: '🏬', color: '#2563eb' },
    { id: 'urgent',  label: { ko: '긴급',     en: 'Urgent',      es: 'Urgente' },          icon: '🚨', color: '#b91c1c' }
  ],

  // ----- 역할 -----
  ROLES: [
    { id: 'owner',           name: '오너',                     nameEn: 'Owner',                 level: 6, icon: '👑', canAssign: true,  canVerify: true,  canApprove: true,  canEvaluate: true,  crossStore: true  },
    { id: 'manager',         name: '점장',                     nameEn: 'Store Manager',         level: 5, icon: '👔', canAssign: true,  canVerify: true,  canApprove: true,  canEvaluate: false, crossStore: false },
    { id: 'asst_manager',    name: '어시스턴트 매니저',        nameEn: 'Assistant Manager',     level: 4, icon: '🎯', canAssign: true,  canVerify: true,  canApprove: true,  canEvaluate: false, crossStore: false },
    { id: 'supervisor',      name: '수퍼바이저',               nameEn: 'Supervisor',            level: 3, icon: '📋', canAssign: true,  canVerify: true,  canApprove: false, canEvaluate: false, crossStore: false },
    { id: 'asst_supervisor', name: '어시스턴트 수퍼바이저',    nameEn: 'Assistant Supervisor',  level: 2, icon: '✅', canAssign: true,  canVerify: true,  canApprove: false, canEvaluate: false, crossStore: false },
    { id: 'employee',        name: '직원',                     nameEn: 'Employee',              level: 1, icon: '👷', canAssign: false, canVerify: false, canApprove: false, canEvaluate: false, crossStore: false }
  ],

  // ----- 시프트 (오프닝 / 클로징) -----
  SHIFTS: {
    opening: {
      id: 'opening',
      name: '오프닝',
      nameEn: 'Opening',
      icon: '🌅',
      color: '#f59e0b',
      colorBg: '#fffbeb',
      colorBorder: '#fbbf24',
      defaultDeadline: '08:30',
      deadlineHour: 10, deadlineMin: 30,
      desc: '매장 오픈 전 준비'
    },
    midday: {
      id: 'midday',
      name: '중간 점검',
      nameEn: 'Midday',
      icon: '☀️',
      color: '#0891b2',
      colorBg: '#ecfeff',
      colorBorder: '#67e8f9',
      defaultDeadline: '14:00',
      deadlineHour: 14, deadlineMin: 30,
      desc: '오후 중간 점검'
    },
    closing: {
      id: 'closing',
      name: '클로징',
      nameEn: 'Closing',
      icon: '🌙',
      color: '#7c3aed',
      colorBg: '#f5f3ff',
      colorBorder: '#a78bfa',
      defaultDeadline: '18:00',
      deadlineHour: 18, deadlineMin: 30,
      desc: '마감 정리 및 내일 준비'
    }
  },

  // ----- 공통 체크리스트 (오프닝) -----
  COMMON_CHECKLIST_OPENING: [
    { id: 'co1',  text: '담당 구역 청소 상태 확인',      en: 'Cleaning check',           es: 'Verificar limpieza' },
    { id: 'co2',  text: '바닥, 통로, 박스 정리',         en: 'Floor & aisle clear',      es: 'Pisos y pasillos' },
    { id: 'co3',  text: '상품 앞당김 / 진열 정리',       en: 'Facing & display',         es: 'Acomodar productos' },
    { id: 'co4',  text: '빈 진열대 확인',                en: 'Empty shelves check',      es: 'Estantes vacíos' },
    { id: 'co5',  text: '리스탁 필요 상품 확인',         en: 'Restocking needs',         es: 'Productos para reponer' },
    { id: 'co6',  text: '세일존 정리 확인',              en: 'Sale zone check',          es: 'Zona de oferta' },
    { id: 'co7',  text: '가격표 매치 확인',              en: 'Price tag match',          es: 'Etiquetas de precio' },
    { id: 'co8',  text: '제품 품질 확인',                en: 'Product quality',          es: 'Calidad del producto' },
    { id: 'co9',  text: '냉장·냉동 작동 이상 확인',      en: 'Cooler/Freezer check',     es: 'Refrigerador/Congelador' },
    { id: 'co10', text: '문제 발생 시 보고 완료',        en: 'Report any issues',        es: 'Reportar problemas' }
  ],

  // ----- 공통 체크리스트 (클로징) -----
  COMMON_CHECKLIST_CLOSING: [
    { id: 'cc1',  text: '진열 마감 / 상품 정리',                en: 'Final facing & cleanup',     es: 'Acomodar y cerrar' },
    { id: 'cc2',  text: '폐기 / 로스 처리 및 수량·금액 기록',   en: 'Waste & loss recording',     es: 'Registro de pérdidas' },
    { id: 'cc3',  text: '재고 부족 상품 기록 (내일 발주)',      en: 'Out-of-stock log',           es: 'Faltantes para mañana' },
    { id: 'cc4',  text: '담당 구역 청소 / 바닥 / 작업대',       en: 'Closing cleaning',           es: 'Limpieza de cierre' },
    { id: 'cc5',  text: '장비 전원 / 온도 / 잠금 확인',         en: 'Equipment shutdown & lock',  es: 'Apagar y cerrar equipos' },
    { id: 'cc6',  text: '쓰레기 / 박스 처리',                   en: 'Trash & box removal',        es: 'Manejo de basura' },
    { id: 'cc7',  text: '내일 준비 / 인수인계 메모',            en: 'Tomorrow prep & handover',   es: 'Preparación mañana' },
    { id: 'cc8',  text: '오늘 발생한 클레임 / 문제 보고',       en: 'Today issues report',        es: 'Reporte de problemas' },
    { id: 'cc9',  text: '가격 오류 정리 / 가격표 회수',         en: 'Price tag recall',           es: 'Retirar etiquetas viejas' },
    { id: 'cc10', text: '마감 사진 보고',                       en: 'Closing photo proof',        es: 'Foto final' }
  ],

  // ----- 부문 정의 -----
  DEPARTMENTS: [
    {
      id: 'produce',
      name: '농산',
      nameSub: '야채/과일',
      nameEn: 'Produce',
      icon: '🥬',
      color: '#22c55e',
      openingExtras: [
        '신선도 확인 (시든 잎, 변색, 무름)',
        '시든 상품 제거 및 폐기 기록',
        '물기 / 곰팡이 / 냄새 확인',
        '과일 테이블 정리',
        '아침 입고 상품 정리',
        '냉장 진열대 온도 확인 (32–40°F)'
      ],
      closingExtras: [
        '폐기 상품 정리 및 로스 수량 기록',
        '시든 상품 / 변색 상품 최종 확인',
        '내일 발주 필요 상품 기록',
        '진열대 / 바닥 물기 제거',
        '냉장 진열대 온도 최종 확인',
        '입고 정리 마감 / 빈 박스 제거'
      ]
    },
    {
      id: 'meat',
      name: '정육',
      nameSub: '고기',
      nameEn: 'Meat',
      icon: '🥩',
      color: '#dc2626',
      openingExtras: [
        '냉장고 온도 확인 (32–40°F)',
        '고기 색상 / 냄새 / 신선도 확인',
        '포장 상태 (찢어짐, 누수) 확인',
        '라벨 날짜 / 유통기한 확인',
        '작업대 위생 확인',
        '칼 / 기계 / 장비 상태 확인'
      ],
      closingExtras: [
        '남은 고기 재고 확인 및 기록',
        '폐기 또는 할인 처리 상품 기록',
        '양념육 재고 확인',
        '작업대 세척 / 칼 위생',
        '기계 청소 (그라인더, 슬라이서)',
        '바닥 청소 / 배수구 확인',
        '냉장·냉동고 문 닫힘 / 온도 최종 확인',
        '내일 작업 필요 상품 기록'
      ]
    },
    {
      id: 'seafood',
      name: '수산',
      nameSub: '생선',
      nameEn: 'Seafood',
      icon: '🐟',
      color: '#0ea5e9',
      openingExtras: [
        '생선 신선도 (눈 / 아가미 / 냄새)',
        '얼음 진열 상태 확인',
        '수조 상태 확인',
        '냉장 온도 확인',
        '손질 도구 위생 확인',
        '판매 준비 완료 확인'
      ],
      closingExtras: [
        '남은 생선 상태 / 폐기 기록',
        '얼음 정리 / 보충',
        '수조 상태 점검',
        '냄새 관리 / 배수구 청소',
        '작업대 세척 / 손질 도구 위생',
        '바닥 청소',
        '내일 입고 필요 상품 기록'
      ]
    },
    {
      id: 'grocery',
      name: '그로서리',
      nameSub: '일반 식품',
      nameEn: 'Grocery',
      icon: '🥫',
      color: '#f59e0b',
      openingExtras: [
        '진열 상태 / 카테고리 정리',
        '박스 제거 / 통로 정리',
        '유통기한 임박 상품 확인',
        '파손 / 부풀어진 포장 확인',
        '벤더 납품 문제 보고',
        '신상품 / 세일 진열 확인'
      ],
      closingExtras: [
        '빈 진열대 / 부족 상품 기록',
        '내일 채워야 할 상품 리스트',
        '백룸 정리',
        '유통기한 임박 상품 확인',
        '파손 상품 기록',
        '카트 / 박스 / 팔레트 정리'
      ]
    },
    {
      id: 'frozen',
      name: '냉동',
      nameSub: 'Frozen',
      nameEn: 'Frozen',
      icon: '❄️',
      color: '#06b6d4',
      openingExtras: [
        '냉동고 온도 확인 (0°F 이하)',
        '문 닫힘 / 가스킷 상태',
        '성에 과다 / 이상 소리 확인',
        '녹았다 다시 언 흔적 확인',
        '박스 파손 / 누수 확인',
        '가격표 / 라벨 확인'
      ],
      closingExtras: [
        '냉동고 온도 최종 확인 (0°F 이하)',
        '문 닫힘 / 가스킷 상태 재점검',
        '진열 정리 / 빈자리 기록',
        '폐기 상품 처리',
        '바닥 / 주변 청소',
        '내일 채울 상품 기록'
      ]
    },
    {
      id: 'refrigerated',
      name: '냉장',
      nameSub: 'Refrigerated',
      nameEn: 'Refrigerated',
      icon: '🧊',
      color: '#0891b2',
      openingExtras: [
        '냉장 온도 확인 (32–40°F)',
        '유통기한 임박 상품 앞당김',
        '누수 / 성에 / 소음 확인',
        '문 가스킷 상태 확인',
        '파손 / 부풀어진 포장 확인',
        '진열 정리 / 가격표 확인'
      ],
      closingExtras: [
        '냉장 온도 최종 확인 (32–40°F)',
        '유통기한 지난 상품 폐기 기록',
        '진열 마감 / 앞당김',
        '문 닫힘 / 가스킷 점검',
        '바닥 누수 / 청소',
        '내일 채울 상품 기록'
      ]
    },
    {
      id: 'cashier',
      name: '캐셔',
      nameSub: '계산대',
      nameEn: 'Cashier',
      icon: '💳',
      color: '#8b5cf6',
      openingExtras: [
        '계산대 오픈 / POS 작동 확인',
        '카드 단말기 작동 확인',
        '거스름돈 / 현금 준비',
        '쇼핑백 / 영수증 용지 확인',
        '환불 / 반품 규정 숙지',
        '멤버십 안내 준비'
      ],
      closingExtras: [
        '현금 마감 / 카운트',
        '카드 결제 문제 / 거부 건 확인',
        '환불 / 반품 내역 정리',
        '고객 클레임 보고',
        '계산대 청소 / 컨베이어 청소',
        'POS 종료 / 단말기 잠금',
        '다음 날 거스름돈 / 용지 준비'
      ]
    },
    {
      id: 'receiving',
      name: '리시빙',
      nameSub: '입고',
      nameEn: 'Receiving',
      icon: '📦',
      color: '#a16207',
      openingExtras: [
        '입고 예정 벤더 확인',
        '입고 공간 / 팔레트 확보',
        '냉장 / 냉동 입고 준비',
        '인보이스 확인 준비',
        '검수 담당자 확인',
        '안전 통로 확보'
      ],
      closingExtras: [
        '당일 입고 벤더 / 수량 기록',
        '누락 상품 / 파손 상품 기록',
        '가격 차이 / 인보이스 문제 기록',
        '인보이스 사무실 전달 여부 확인',
        '입고장 청소 / 미정리 상품 점검',
        '내일 입고 예정 벤더 확인'
      ]
    },
    {
      id: 'stock',
      name: '스탁',
      nameSub: '백룸',
      nameEn: 'Stock',
      icon: '🏬',
      color: '#d97706',
      openingExtras: [
        '진열 부족 상품 확인',
        '백룸 재고 확인',
        '선입선출 (FIFO) 확인',
        '세일 상품 우선 진열',
        '통로 / 카트 정리',
        '박스 제거'
      ],
      closingExtras: [
        '오늘 진열 못한 상품 기록',
        '내일 우선 진열 상품 리스트',
        '백룸 정리 / 동선 확보',
        '유통기한 임박 / 파손 상품 점검',
        '카트 / 박스 / 팔레트 정리',
        '리프트 / 작업 도구 보관'
      ]
    },
    {
      id: 'price',
      name: '가격/세일',
      nameSub: 'Price & Sale',
      nameEn: 'Price/Sale',
      icon: '🏷️',
      color: '#ea580c',
      openingExtras: [
        '오늘 세일 상품 확인',
        'POS 가격 / 진열 가격 일치 확인',
        '가격표 부착 / ESL 업데이트',
        '이전 세일 가격표 제거',
        '가격 오류 점검 / 수정',
        '고객 가격 클레임 사전 점검'
      ],
      closingExtras: [
        '당일 가격 오류 / 클레임 기록',
        '수정 완료 상품 기록',
        '미수정 상품 / 후속 작업 리스트',
        '내일 세일 변경 상품 확인',
        '오늘 ESL 업데이트 실패 상품',
        '점장에게 가격 종합 보고'
      ]
    },
    {
      id: 'sushi',
      name: '스시킹',
      nameSub: '일식 / 스시 / 사시미',
      nameEn: 'Sushi King',
      icon: '🍣',
      color: '#16a34a',
      openingExtras: [
        '스시 재료 신선도 확인',
        '생선 / 재료 온도 확인',
        '밥 준비 상태 확인',
        '포장 용기 / 라벨 준비',
        '진열대 청소',
        '냉장 진열 온도 확인'
      ],
      closingExtras: [
        '판매 완료 / 남은 상품 기록',
        '폐기 상품 기록 (라벨 날짜 확인)',
        '작업대 세척 / 칼 위생',
        '냉장고 정리 / 온도 최종 확인',
        '내일 생산 계획 / 우선 메뉴',
        '재료 부족 보고'
      ]
    },
    {
      id: 'bbq',
      name: '비비큐 치킨',
      nameSub: '한식 통닭',
      nameEn: 'BBQ Chicken',
      icon: '🍗',
      color: '#b91c1c',
      openingExtras: [
        '튀김기 상태 확인',
        '기름 상태 / 색깔 확인',
        '치킨 원재료 해동 상태',
        '소스 / 양념 준비',
        '포장 박스 / 무 준비',
        '프랜차이즈 기준 준수 확인'
      ],
      closingExtras: [
        '남은 치킨 / 폐기 기록',
        '기름 상태 / 교체 필요 여부',
        '튀김기 청소 / 필터',
        '작업대 / 바닥 청소',
        '소스 / 양념 재고 확인',
        '내일 원재료 해동 계획',
        '매출 / 문제 종합 보고'
      ]
    },
    {
      id: 'yumsem',
      name: '얌셈 김밥',
      nameSub: '분식 전문',
      nameEn: 'Yum Sem Kimbap',
      icon: '🍱',
      color: '#65a30d',
      openingExtras: [
        '김밥 재료 / 밥 준비',
        '라면 / 떡볶이 / 분식 재료',
        '포장 용기 / 일회용품 준비',
        '메뉴판 / 가격 확인',
        '조리 장비 / 위생 확인',
        '오픈 메뉴 생산 계획'
      ],
      closingExtras: [
        '남은 재료 / 폐기 기록',
        '인기 / 부진 메뉴 기록',
        '작업대 / 조리 장비 청소',
        '장비 전원 종료 / 가스 차단',
        '내일 재료 부족 / 발주 보고',
        '프랜차이즈 기준 준수 확인'
      ]
    },
    {
      id: 'umaga',
      name: 'UMAGA',
      nameSub: '자체 제조 (반찬 / 밀키트 / 김치 / 김밥 / 양념고기)',
      nameEn: 'UMAGA Production',
      icon: '🥣',
      color: '#9333ea',
      openingExtras: [
        '오늘 생산 계획 확인',
        '원재료 상태 / 재고 확인',
        '전날 제조 상품 상태 확인',
        '라벨 날짜 / 유통기한 확인',
        '포장 용기 준비',
        '조리장 위생 / 냉장·냉동 온도 확인',
        '담당자별 생산 업무 분담',
        '우선 생산 상품 확인'
      ],
      closingExtras: [
        '오늘 생산 완료 / 미완료 상품 기록',
        '폐기 상품 기록 (수량 / 금액)',
        '남은 원재료 기록',
        '내일 생산 필요 상품 리스트',
        '라벨 오류 / 유통기한 점검',
        '냉장·냉동 보관 상태 확인',
        '작업장 청소 / 조리 도구 위생',
        '장비 전원 종료'
      ]
    },
    {
      id: 'bakery',
      name: '베이커리',
      nameSub: '제과제빵',
      nameEn: 'Bakery',
      icon: '🥐',
      color: '#c2410c',
      openingExtras: [
        '오늘 생산할 빵 종류 확인',
        '반죽 상태 확인',
        '오븐 / 발효기 작동 확인',
        '진열대 청소',
        '포장 용기 / 라벨 준비',
        '유통기한 라벨 확인'
      ],
      closingExtras: [
        '판매 완료 / 남은 상품 기록',
        '할인 또는 폐기 상품 기록',
        '내일 생산 계획 / 반죽 준비',
        '원재료 부족 보고',
        '오븐 / 발효기 / 장비 청소',
        '진열대 청소',
        '작업장 마감 / 가스 차단'
      ]
    }
  ],

  // ----- 평가 그룹 (7개 핵심 평가 단위) -----
  // 평가 리포트의 기본 부문 구분. 각 그룹 = 평가 1단위.
  DEPT_GROUPS: [
    { id: 'stock_cashier', icon: '🛒', members: ['stock', 'cashier', 'grocery', 'frozen', 'refrigerated', 'receiving', 'price'] },
    { id: 'produce',       icon: '🥬', members: ['produce'] },
    { id: 'meat_seafood',  icon: '🥩', members: ['meat', 'seafood'] },
    { id: 'kfood',         icon: '🍱', members: ['umaga', 'yumsem'] },
    { id: 'sushi',         icon: '🍣', members: ['sushi'] },
    { id: 'bbq',           icon: '🍗', members: ['bbq'] },
    { id: 'bakery',        icon: '🥐', members: ['bakery'] }
  ],

  // ----- 상태 정의 -----
  STATUS: {
    gray:     { label: '시작 전',    short: '대기',  color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db' },
    yellow:   { label: '진행 중',    short: '진행',  color: '#92400e', bg: '#fef3c7', border: '#fbbf24' },
    green:    { label: '직원 완료',  short: '완료',  color: '#15803d', bg: '#dcfce7', border: '#22c55e' },
    red:      { label: '문제 발생',  short: '문제',  color: '#991b1b', bg: '#fee2e2', border: '#ef4444' },
    verified: { label: '수퍼바이저 확인', short: '확인', color: '#1e40af', bg: '#dbeafe', border: '#3b82f6' },
    approved: { label: '점장 승인',  short: '승인',  color: '#065f46', bg: '#a7f3d0', border: '#10b981' }
  }

};

// ----- 부문별 추천 구역 -----
const KMOCS_ZONES = {
  produce:      ['야채 냉장 진열대', '과일 테이블', '백룸 농산 재고', '입고 정리 구역'],
  meat:         ['정육 진열대', '냉장 백룸', '작업대 / 칼날', '양념육 코너'],
  seafood:      ['생선 진열대', '수조', '냉장 백룸', '손질 작업대'],
  grocery:      ['Aisle 1', 'Aisle 2', 'Aisle 3', 'Aisle 4', 'Aisle 5', '엔드캡', '세일존', '백룸 재고'],
  frozen:       ['Frozen Door 1–4', 'Frozen Door 5–8', 'Frozen Aisle', '아이스크림 코너'],
  refrigerated: ['우유 / 음료 냉장', '햄 / 베이컨 냉장', '두부 / 반찬 냉장', '주류 냉장'],
  cashier:      ['계산대 1', '계산대 2', '계산대 3', '셀프 체크아웃'],
  receiving:    ['입고 도크', '냉장 입고 구역', '냉동 입고 구역', '인보이스 데스크'],
  stock:        ['백룸 일반', '백룸 냉장', '백룸 냉동', '엔드캡 진열'],
  price:        ['세일 가격표', 'POS 가격 동기화', 'ESL 업데이트', '신상품 등록'],
  sushi:        ['스시 진열대', '롤 작업대', '냉장 백룸', '재료 준비대'],
  bbq:          ['튀김 작업대', '진열 / 보온대', '재료 준비실', '포장 구역'],
  yumsem:       ['김밥 작업대', '분식 조리대', '진열대', '재료 준비실'],
  umaga:        ['반찬 제조실', '밀키트 제조실', '김치 제조실', '김밥 제조실', '양념고기 제조실', '냉장 보관실'],
  bakery:       ['반죽 작업대', '오븐 / 발효기', '진열대', '포장 작업대']
};

// ----- 유틸: 시프트별 공통/부문 체크리스트 가져오기 -----
function getCommonChecklist(shift) {
  return shift === 'closing' ? KMOCS.COMMON_CHECKLIST_CLOSING : KMOCS.COMMON_CHECKLIST_OPENING;
}
function getDeptExtras(deptId, shift) {
  const d = KMOCS.DEPARTMENTS.find(x => x.id === deptId);
  if (!d) return [];
  return shift === 'closing' ? (d.closingExtras || []) : (d.openingExtras || d.extras || []);
}

// ============================================================
// i18n 사전 — UI 핵심 라벨 (KO / EN / ES)
// ============================================================
const I18N = {
  app_title:        { ko: '김치 일일 업무 보고',       en: 'Kimchi Daily Work Report',    es: 'Reporte Diario de Kimchi' },
  app_subtitle:     { ko: '',                         en: '',                            es: '' },

  // 시프트
  shift_opening:    { ko: '매장 오전 준비',           en: 'Morning Prep',                es: 'Preparación matutina' },
  shift_midday:     { ko: '중간 점검',                en: 'Midday Check',                es: 'Chequeo medio día' },
  shift_closing:    { ko: '매장 마감 정리',           en: 'Closing',                     es: 'Cierre' },
  shift_opening_d:  { ko: '~ 오전 10:30 마감',         en: '~ 10:30 AM deadline',         es: '~ 10:30 AM' },
  shift_midday_d:   { ko: '~ 오후 2:30 마감',          en: '~ 2:30 PM deadline',          es: '~ 2:30 PM' },
  shift_closing_d:  { ko: '~ 오후 6:30 마감',          en: '~ 6:30 PM deadline',          es: '~ 6:30 PM' },

  // 역할
  role_manager:         { ko: '점장',                en: 'Store Manager',         es: 'Gerente' },
  role_asst_manager:    { ko: '어시스턴트 매니저',   en: 'Assistant Manager',     es: 'Gerente Asistente' },
  role_supervisor:      { ko: '수퍼바이저',          en: 'Supervisor',            es: 'Supervisor' },
  role_asst_supervisor: { ko: '어시스턴트 수퍼바이저', en: 'Assistant Supervisor', es: 'Supervisor Asistente' },
  role_employee:        { ko: '직원',                en: 'Employee',              es: 'Empleado' },
  role_owner:           { ko: '오너',                en: 'Owner',                 es: 'Dueño' },

  // 로그인
  login_store:      { ko: '매장 선택',                en: 'Select Store',                es: 'Seleccionar Tienda' },
  login_name:       { ko: '이름',                     en: 'Name',                        es: 'Nombre' },
  login_role:       { ko: '역할 / 직책',              en: 'Role / Position',             es: 'Rol / Puesto' },
  login_start:      { ko: '시작하기',                 en: 'Start',                       es: 'Comenzar' },
  login_name_ph:    { ko: '예: 홍길동',               en: 'e.g. John Smith',             es: 'ej. Juan Pérez' },
  login_principles: { ko: '핵심 원칙',                en: 'Core Principles',             es: 'Principios Clave' },
  login_p1:         { ko: '누가 시켰는가 / 받았는가 / 실행했는가 / 확인했는가',
                      en: 'Who assigned / received / executed / verified',
                      es: 'Quién asignó / recibió / ejecutó / verificó' },
  login_p2:         { ko: '사진 보고 + 책임자 확인 없이는 완료가 아닙니다.',
                      en: 'Not complete without photo proof + supervisor verification.',
                      es: 'No está completo sin foto + verificación del supervisor.' },

  // 네비게이션
  nav_dashboard:    { ko: '현황',                     en: 'Dashboard',                   es: 'Panel' },
  nav_assign:       { ko: '배정',                     en: 'Assign',                      es: 'Asignar' },
  nav_verify:       { ko: '확인',                     en: 'Verify',                      es: 'Verificar' },
  nav_approve:      { ko: '승인',                     en: 'Approve',                     es: 'Aprobar' },
  nav_report:       { ko: '업무 현황 및 평가 리포트',  en: 'Status & Evaluation Report',  es: 'Estado y Evaluación' },
  nav_my_tasks:     { ko: '내 업무',                  en: 'My Tasks',                    es: 'Mis Tareas' },
  nav_staff:        { ko: '직원',                     en: 'Staff',                       es: 'Personal' },
  nav_settings:     { ko: '설정',                     en: 'Settings',                    es: 'Ajustes' },
  nav_notices:      { ko: '공지',                     en: 'Notices',                     es: 'Avisos' },
  nav_freerep:      { ko: '자유보고',                 en: 'Free Report',                 es: 'Reporte Libre' },

  // 대시보드
  dash_manager:     { ko: '점장 대시보드',            en: 'Manager Dashboard',           es: 'Panel del Gerente' },
  dash_supervisor:  { ko: '수퍼바이저 대시보드',      en: 'Supervisor Dashboard',        es: 'Panel del Supervisor' },
  dash_employee:    { ko: '내 오늘 업무',             en: 'My Tasks Today',              es: 'Mis Tareas Hoy' },
  dash_no_tasks:    { ko: '오늘 배정된 업무가 없습니다.', en: 'No tasks assigned today.', es: 'No hay tareas asignadas hoy.' },
  dash_assign_now:  { ko: '지금 배정하기',            en: 'Assign Now',                  es: 'Asignar Ahora' },
  dash_dept_status: { ko: '부문별 현황',              en: 'Status by Department',        es: 'Estado por Departamento' },
  dash_progress:    { ko: '진행률',                   en: 'Progress',                    es: 'Progreso' },

  // 상태 pills
  status_gray:      { ko: '대기',                     en: 'Pending',                     es: 'Pendiente' },
  status_yellow:    { ko: '진행',                     en: 'In Progress',                 es: 'En Curso' },
  status_green:     { ko: '완료',                     en: 'Done',                        es: 'Hecho' },
  status_red:       { ko: '문제',                     en: 'Issue',                       es: 'Problema' },
  status_verified:  { ko: '확인',                     en: 'Verified',                    es: 'Verificado' },
  status_approved:  { ko: '승인',                     en: 'Approved',                    es: 'Aprobado' },

  // 공지
  notices_title:    { ko: '공지사항',                 en: 'Notices',                     es: 'Avisos' },
  notices_all:      { ko: '전체 지점 공지',           en: 'All Stores Notice',           es: 'Aviso Todas Tiendas' },
  notices_store:    { ko: '지점 공지',                en: 'Store Notice',                es: 'Aviso de Tienda' },
  notices_new:      { ko: '+ 새 공지 작성',           en: '+ New Notice',                es: '+ Nuevo Aviso' },
  notices_title_ph: { ko: '공지 제목',                en: 'Notice title',                es: 'Título del aviso' },
  notices_body_ph:  { ko: '공지 내용',                en: 'Notice body',                 es: 'Contenido del aviso' },
  notices_kind:     { ko: '공지 종류',                en: 'Notice type',                 es: 'Tipo de aviso' },
  notices_target:   { ko: '대상 지점',                en: 'Target store',                es: 'Tienda destino' },
  notices_target_all: { ko: '전체 지점',              en: 'All stores',                  es: 'Todas las tiendas' },
  notices_publish:  { ko: '공지 게시',                en: 'Publish',                     es: 'Publicar' },
  notices_empty:    { ko: '게시된 공지가 없습니다.',  en: 'No notices yet.',             es: 'No hay avisos.' },
  notices_pin:      { ko: '상단 고정',                en: 'Pin to top',                  es: 'Fijar' },
  notices_delete:   { ko: '공지 삭제',                en: 'Delete notice',               es: 'Eliminar aviso' },

  // 자율 리포트
  freerep_title:    { ko: '자유 사진 리포트',         en: 'Free Photo Report',           es: 'Reporte Libre con Foto' },
  freerep_desc:     { ko: '업무 외에 발견한 문제 / 알림 / 제안을 사진과 함께 자유롭게 올리세요.',
                      en: 'Report any issue, observation, or suggestion outside your assigned tasks.',
                      es: 'Reporte cualquier problema, observación o sugerencia fuera de sus tareas asignadas.' },
  freerep_new:      { ko: '+ 새 리포트',              en: '+ New Report',                es: '+ Nuevo Reporte' },
  freerep_kind:     { ko: '리포트 종류',              en: 'Report type',                 es: 'Tipo de reporte' },
  freerep_kinds:    { ko: ['문제 / 사고', '제품 품질', '시설 / 장비', '청결', '안전', '기타'],
                      en: ['Issue / Incident', 'Product Quality', 'Facility / Equipment', 'Cleanliness', 'Safety', 'Other'],
                      es: ['Problema / Incidente', 'Calidad de producto', 'Instalación / Equipo', 'Limpieza', 'Seguridad', 'Otro'] },
  freerep_title_ph: { ko: '리포트 제목',              en: 'Report title',                es: 'Título del reporte' },
  freerep_body_ph:  { ko: '상세 내용 (선택)',         en: 'Details (optional)',          es: 'Detalles (opcional)' },
  freerep_submit:   { ko: '리포트 제출',              en: 'Submit Report',               es: 'Enviar Reporte' },
  freerep_empty:    { ko: '제출된 리포트가 없습니다.', en: 'No reports yet.',            es: 'No hay reportes.' },
  freerep_photo:    { ko: '📷 사진 추가',             en: '📷 Add Photo',                es: '📷 Agregar Foto' },
  freerep_resolved: { ko: '처리 완료',                en: 'Resolved',                    es: 'Resuelto' },
  freerep_open:     { ko: '확인 대기',                en: 'Open',                        es: 'Abierto' },
  freerep_acknowledged: { ko: '확인됨',               en: 'Acknowledged',                es: 'Reconocido' },

  // 공통 버튼
  btn_back:         { ko: '돌아가기',                 en: 'Back',                        es: 'Atrás' },
  btn_save:         { ko: '저장',                     en: 'Save',                        es: 'Guardar' },
  btn_cancel:       { ko: '취소',                     en: 'Cancel',                      es: 'Cancelar' },
  btn_delete:       { ko: '삭제',                     en: 'Delete',                      es: 'Eliminar' },
  btn_logout:       { ko: '로그아웃',                 en: 'Logout',                      es: 'Cerrar sesión' },
  btn_print:        { ko: '🖨️ 인쇄',                   en: '🖨️ Print',                    es: '🖨️ Imprimir' },

  // 토스트
  toast_welcome:    { ko: '환영합니다',               en: 'Welcome',                     es: 'Bienvenido' },
  toast_saved:      { ko: '저장되었습니다.',          en: 'Saved.',                      es: 'Guardado.' },
  toast_published:  { ko: '공지가 게시되었습니다.',   en: 'Notice published.',           es: 'Aviso publicado.' }
};

function t(key, lang) {
  lang = lang || 'ko';
  const entry = I18N[key];
  if (!entry) return key;
  return entry[lang] || entry.ko || key;
}

// ----- 부문 이름 다국어 -----
const KMOCS_DEPT_I18N = {
  produce:      { ko: '농산',          en: 'Produce',          es: 'Frutas y Verduras' },
  meat:         { ko: '정육',          en: 'Meat',             es: 'Carnicería' },
  seafood:      { ko: '수산',          en: 'Seafood',          es: 'Pescadería' },
  grocery:      { ko: '그로서리',      en: 'Grocery',          es: 'Abarrotes' },
  frozen:       { ko: '냉동',          en: 'Frozen',           es: 'Congelados' },
  refrigerated: { ko: '냉장',          en: 'Refrigerated',     es: 'Refrigerados' },
  cashier:      { ko: '캐셔',          en: 'Cashier',          es: 'Cajeros' },
  receiving:    { ko: '리시빙',        en: 'Receiving',        es: 'Recepción' },
  stock:        { ko: '스탁',          en: 'Stock',            es: 'Almacén' },
  price:        { ko: '가격/세일',     en: 'Price/Sale',       es: 'Precios/Ofertas' },
  sushi:        { ko: '스시킹',        en: 'Sushi King',       es: 'Sushi King' },
  bbq:          { ko: '비비큐 치킨',   en: 'BBQ Chicken',      es: 'Pollo BBQ Coreano' },
  yumsem:       { ko: '얌셈 김밥',     en: 'Yum Sem Kimbap',   es: 'Yum Sem (Coreano)' },
  umaga:        { ko: 'UMAGA',         en: 'UMAGA',            es: 'UMAGA Producción' },
  bakery:       { ko: '베이커리',      en: 'Bakery',           es: 'Panadería' }
};

// ----- 부문 부제목 (sub) 다국어 -----
const KMOCS_DEPT_SUB_I18N = {
  produce:      { ko: '야채/과일',                          en: 'Vegetables/Fruits',           es: 'Vegetales/Frutas' },
  meat:         { ko: '고기',                                en: 'Meat',                        es: 'Carne' },
  seafood:      { ko: '생선',                                en: 'Fish',                        es: 'Pescado' },
  grocery:      { ko: '일반 식품',                           en: 'General Grocery',             es: 'Comestibles' },
  frozen:       { ko: 'Frozen',                              en: 'Frozen',                      es: 'Congelados' },
  refrigerated: { ko: 'Refrigerated',                        en: 'Refrigerated',                es: 'Refrigerados' },
  cashier:      { ko: '계산대',                              en: 'Checkout',                    es: 'Caja' },
  receiving:    { ko: '입고',                                en: 'Receiving',                   es: 'Recepción' },
  stock:        { ko: '백룸',                                en: 'Backroom',                    es: 'Almacén' },
  price:        { ko: 'Price & Sale',                        en: 'Price & Sale',                es: 'Precios y Oferta' },
  sushi:        { ko: '일식 / 스시 / 사시미',                en: 'Japanese / Sushi / Sashimi',  es: 'Japonés / Sushi' },
  bbq:          { ko: '한식 통닭',                            en: 'Korean Fried Chicken',       es: 'Pollo frito coreano' },
  yumsem:       { ko: '분식 전문',                           en: 'Korean Snack Bar',            es: 'Comida coreana' },
  umaga:        { ko: '자체 제조 (반찬/밀키트/김치/김밥/양념고기)',
                  en: 'In-house Production (Banchan/Meal kits/Kimchi/Kimbap/Marinated meat)',
                  es: 'Producción propia (Banchan/Kits/Kimchi/Kimbap/Carne marinada)' },
  bakery:       { ko: '제과제빵',                            en: 'Bakery',                      es: 'Panadería' }
};

// ----- i18n 추가 키 (기존 I18N 객체 확장) -----
Object.assign(I18N, {
  // 워크플로우 단계
  wf_step1: { ko: '①배정', en: '①Assigned', es: '①Asignado' },
  wf_step2: { ko: '②수령', en: '②Received', es: '②Recibido' },
  wf_step3: { ko: '③실행', en: '③Execute',  es: '③Ejecutar' },
  wf_step4: { ko: '④사진보고', en: '④Photo', es: '④Foto' },
  wf_step5: { ko: '⑤확인',     en: '⑤Verify', es: '⑤Verificar' },
  wf_step6: { ko: '⑥승인',     en: '⑥Approve', es: '⑥Aprobar' },

  // 섹션 헤더
  sec_needs_verify: { ko: '확인 대기',     en: 'Needs Verify',  es: 'Por Verificar' },
  sec_in_progress:  { ko: '진행 중',       en: 'In Progress',   es: 'En Curso' },
  sec_not_started:  { ko: '미시작',        en: 'Not Started',   es: 'Sin Iniciar' },
  sec_verified:     { ko: '확인 완료',     en: 'Verified',      es: 'Verificado' },
  sec_approved:     { ko: '승인 완료',     en: 'Approved',      es: 'Aprobado' },

  // 작업 상세 라벨
  td_assigner:      { ko: '지시자',        en: 'Assigned by',   es: 'Asignado por' },
  td_receiver:      { ko: '수령자',        en: 'Receiver',      es: 'Receptor' },
  td_received_at:   { ko: '수령 시각',     en: 'Received at',   es: 'Recibido a las' },
  td_started_at:    { ko: '시작 시각',     en: 'Started at',    es: 'Iniciado a las' },
  td_completed_at:  { ko: '완료 시각',     en: 'Completed at',  es: 'Completado a las' },
  td_deadline:      { ko: '마감 시간',     en: 'Deadline',      es: 'Hora límite' },
  td_verifier:      { ko: '확인 책임자',   en: 'Verifier',      es: 'Verificador' },
  td_photo_report:  { ko: '사진 보고',     en: 'Photo report',  es: 'Reporte foto' },
  td_required:      { ko: '필수',          en: 'Required',      es: 'Requerido' },
  td_optional:      { ko: '선택',          en: 'Optional',      es: 'Opcional' },
  td_status:        { ko: '현재 상태',     en: 'Current status', es: 'Estado actual' },
  td_checklist:     { ko: '체크리스트',    en: 'Checklist',     es: 'Lista de verificación' },
  td_notes:         { ko: '메모',          en: 'Notes',         es: 'Notas' },
  td_emp_notes:     { ko: '직원 메모',     en: 'Employee notes', es: 'Notas del empleado' },
  td_ver_notes:     { ko: '확인자 메모',   en: 'Verifier notes', es: 'Notas del verificador' },
  td_mgr_notes:     { ko: '점장 메모',     en: 'Manager notes', es: 'Notas del gerente' },
  td_zone:          { ko: '담당 구역',     en: 'Zone',          es: 'Zona' },
  td_zone_unassigned:{ ko: '구역 미지정',  en: 'Unassigned zone', es: 'Zona sin asignar' },
  td_photo_must:    { ko: '사진 필수',     en: 'Photo required', es: 'Foto requerida' },
  td_add_photo:     { ko: '사진 추가',     en: 'Add photo',     es: 'Agregar foto' },
  td_issue_mark:    { ko: '⚠️ 문제 있음',   en: '⚠️ Mark issue',  es: '⚠️ Marcar problema' },
  td_issue_unmark:  { ko: '⚠️ 문제 해제',   en: '⚠️ Unmark',      es: '⚠️ Desmarcar' },
  td_issue_ph:      { ko: '문제 내용 입력', en: 'Enter issue details', es: 'Detalle del problema' },
  td_notes_ph:      { ko: '추가 보고 내용', en: 'Additional notes',     es: 'Notas adicionales' },

  // 액션 버튼
  act_receive:        { ko: '✅ 업무 확인 (수령)',  en: '✅ Receive Task',     es: '✅ Recibir Tarea' },
  act_submit:         { ko: '🎉 보고 제출',          en: '🎉 Submit Report',    es: '🎉 Enviar Reporte' },
  act_submit_issues:  { ko: '⚠️ 문제 포함 보고',     en: '⚠️ Submit with Issues', es: '⚠️ Enviar con problemas' },
  act_verify_ok:      { ko: '✅ 확인 승인',          en: '✅ Verify',           es: '✅ Verificar' },
  act_verify_back:    { ko: '↩ 재지시',              en: '↩ Reassign',         es: '↩ Reasignar' },
  act_mgr_approve:    { ko: '🔑 점장 최종 승인',     en: '🔑 Manager Approval', es: '🔑 Aprobación gerente' },
  act_open_approve:   { ko: '🚪 매장 오픈 승인',     en: '🚪 Approve Store Open', es: '🚪 Aprobar Apertura' },
  act_close_approve:  { ko: '🌙 마감 승인',           en: '🌙 Approve Closing',  es: '🌙 Aprobar Cierre' },
  act_assign:         { ko: '📋 배정 완료',           en: '📋 Assign',           es: '📋 Asignar' },
  act_bulk_approve:   { ko: '개 일괄 승인',           en: ' bulk approve',       es: ' aprobar todos' },

  // 경고 / 안내
  warn_check_all:    { ko: '⚠️ 모든 항목을 체크해야 보고할 수 있습니다.',
                       en: '⚠️ All items must be checked before submitting.',
                       es: '⚠️ Debe marcar todos los ítems antes de enviar.' },
  warn_photo_must:   { ko: '⚠️ 사진 보고가 필수입니다.',
                       en: '⚠️ Photo report is required.',
                       es: '⚠️ Se requiere reporte con foto.' },
  warn_no_photos:    { ko: '⚠️ 사진 보고 필수인데 사진이 없습니다.',
                       en: '⚠️ Photo required but no photos attached.',
                       es: '⚠️ Foto requerida pero no hay fotos.' },
  info_n_issues:     { ko: '개 항목에 문제 표시',     en: ' items flagged',      es: ' ítems marcados' },
  info_no_emp_report:{ ko: '아직 직원 보고가 제출되지 않았습니다.',
                       en: 'Employee has not submitted yet.',
                       es: 'El empleado aún no ha enviado.' },
  info_all_open:     { ko: '✅ 모든 부문 승인 완료 — 매장 오픈 가능',
                       en: '✅ All departments approved — store ready to open',
                       es: '✅ Todos aprobados — listo para abrir' },
  info_all_close:    { ko: '✅ 모든 부문 승인 완료 — 마감 완료',
                       en: '✅ All approved — closing complete',
                       es: '✅ Todos aprobados — cierre completo' },
  info_has_issues:   { ko: '⚠️ 문제 부문이 있습니다.',
                       en: '⚠️ Some departments have issues.',
                       es: '⚠️ Algunos departamentos tienen problemas.' },
  info_partial:      { ko: '⏳ 일부 부문 미승인.',     en: '⏳ Some not yet approved.',  es: '⏳ Algunos sin aprobar.' },
  info_verify_intro: { ko: '직원 보고를 확인하고 사진/현장을 검토한 뒤 승인합니다.',
                       en: 'Review the employee report and photos/site, then approve.',
                       es: 'Revise el reporte del empleado y fotos, luego apruebe.' },

  // 배정 폼 라벨
  assign_date:       { ko: '날짜',                en: 'Date',                  es: 'Fecha' },
  assign_tomorrow:   { ko: '(내일)',              en: '(tomorrow)',            es: '(mañana)' },
  assign_today:      { ko: '(오늘)',              en: '(today)',               es: '(hoy)' },
  assign_dept:       { ko: '부문',                en: 'Department',            es: 'Departamento' },
  assign_dept_pick:  { ko: '— 선택 —',            en: '— Select —',            es: '— Seleccionar —' },
  assign_zone:       { ko: '담당 구역 / Zone',    en: 'Zone',                  es: 'Zona' },
  assign_emp:        { ko: '담당 직원',           en: 'Employee',              es: 'Empleado' },
  assign_emp_ph:     { ko: '직원 이름',           en: 'Employee name',         es: 'Nombre del empleado' },
  assign_verifier:   { ko: '확인 책임자',         en: 'Verifier',              es: 'Verificador' },
  assign_verifier_ph:{ ko: '수퍼바이저 이름',     en: 'Supervisor name',       es: 'Nombre del supervisor' },
  assign_deadline:   { ko: '마감 시간',           en: 'Deadline',              es: 'Hora límite' },
  assign_photo_req:  { ko: '사진 보고 필수',      en: 'Photo report required', es: 'Foto requerida' },
  assign_checklist:  { ko: '체크리스트',           en: 'Checklist',             es: 'Lista' },
  assign_auto_fill:  { ko: '부문 선택 시 자동 채워집니다.',
                       en: 'Auto-filled when department selected.',
                       es: 'Se llena al seleccionar departamento.' },
  assign_custom:     { ko: '직접 항목 추가',      en: 'Add custom item',       es: 'Agregar ítem personalizado' },
  assign_hint_open:  { ko: '전날 퇴근 전에 다음날 오프닝을 배정하세요.',
                       en: 'Assign tomorrow\'s opening before leaving today.',
                       es: 'Asigne la apertura de mañana antes de salir hoy.' },
  assign_hint_close: { ko: '마감 전에 클로징 업무를 배정하세요.',
                       en: 'Assign closing tasks before end of day.',
                       es: 'Asigne tareas de cierre antes de cerrar.' },

  // 토스트
  toast_received:    { ko: '업무를 수령했습니다.', en: 'Task received.',         es: 'Tarea recibida.' },
  toast_submitted:   { ko: '보고가 제출되었습니다.', en: 'Report submitted.',    es: 'Reporte enviado.' },
  toast_assigned:    { ko: '님께 배정',            en: ' assigned',              es: ' asignado' },
  toast_verified:    { ko: '확인 완료',            en: 'Verified',               es: 'Verificado' },
  toast_reassigned:  { ko: '재지시되었습니다.',     en: 'Reassigned.',            es: 'Reasignado.' },
  toast_approved:    { ko: '점장 최종 승인 완료',  en: 'Manager approved',       es: 'Gerente aprobó' },
  toast_photo_added: { ko: '사진 추가됨',          en: 'Photo added',            es: 'Foto agregada' },
  toast_photo_fail:  { ko: '사진 첨부 실패',       en: 'Photo upload failed',    es: 'Falló la foto' },
  toast_deleted:     { ko: '삭제됨',                en: 'Deleted',                es: 'Eliminado' },
  toast_added:       { ko: '추가됨',                en: 'Added',                  es: 'Agregado' },
  toast_resolved:    { ko: '처리 완료',             en: 'Resolved',               es: 'Resuelto' },
  toast_acked:       { ko: '확인됨',                en: 'Acknowledged',           es: 'Reconocido' },

  // 보고서
  report_title:      { ko: '업무 현황 및 평가 리포트', en: 'Status & Evaluation Report', es: 'Reporte de Estado y Evaluación' },
  report_summary:    { ko: '전체 요약',            en: 'Overall Summary',        es: 'Resumen General' },
  report_date:       { ko: '날짜',                 en: 'Date',                   es: 'Fecha' },
  report_store:      { ko: '지점',                 en: 'Store',                  es: 'Tienda' },
  report_shift:      { ko: '시프트',               en: 'Shift',                  es: 'Turno' },
  report_total:      { ko: '전체 업무',            en: 'Total tasks',            es: 'Tareas totales' },
  report_emp_done:   { ko: '완료 (직원)',          en: 'Completed (employee)',   es: 'Completados' },
  report_verified:   { ko: '확인',                 en: 'Verified',               es: 'Verificados' },
  report_approved:   { ko: '승인',                 en: 'Approved',               es: 'Aprobados' },
  report_issues:     { ko: '문제',                 en: 'Issues',                 es: 'Problemas' },
  report_dept_status:{ ko: '부문별 현황',          en: 'Status by Department',   es: 'Estado por Depto.' },
  report_th_dept:    { ko: '부문',                 en: 'Department',             es: 'Departamento' },
  report_th_total:   { ko: '전체',                 en: 'Total',                  es: 'Total' },
  report_th_done:    { ko: '완료',                 en: 'Done',                   es: 'Hecho' },
  report_th_verify:  { ko: '확인',                 en: 'Verify',                 es: 'Verif.' },
  report_th_appr:    { ko: '승인',                 en: 'Appr.',                  es: 'Aprob.' },
  report_th_iss:     { ko: '문제',                 en: 'Issues',                 es: 'Probl.' },
  report_th_photo:   { ko: '사진',                 en: 'Photos',                 es: 'Fotos' },
  report_issues_found:{ ko: '발견된 문제',          en: 'Issues Found',           es: 'Problemas Encontrados' },
  report_no_issues:  { ko: '문제 없음',            en: 'No issues',              es: 'Sin problemas' },
  report_no_data:    { ko: '데이터 없음',           en: 'No data',                es: 'Sin datos' },
  report_generated:  { ko: '생성',                 en: 'Generated',              es: 'Generado' },

  // 평가 리포트
  eval_overall:      { ko: '종합 평가',           en: 'Overall Evaluation',     es: 'Evaluación General' },
  eval_score:        { ko: '점수',                en: 'Score',                  es: 'Puntaje' },
  eval_grade:        { ko: '등급',                en: 'Grade',                  es: 'Grado' },
  eval_dept_section: { ko: '부문별 평가',         en: 'Department Evaluation',  es: 'Evaluación por Depto.' },
  eval_emp_section:  { ko: '직원별 성과',         en: 'Employee Performance',   es: 'Desempeño del Personal' },
  eval_completion:   { ko: '완료율',              en: 'Completion',             es: 'Cumplimiento' },
  eval_photo:        { ko: '사진 충실도',         en: 'Photo Coverage',         es: 'Cobertura de Fotos' },
  eval_timing:       { ko: '시간 준수',           en: 'On-Time',                es: 'Puntualidad' },
  eval_quality:      { ko: '무문제율',            en: 'Issue-Free',             es: 'Sin Problemas' },
  eval_grade_a:      { ko: 'A · 우수',            en: 'A · Excellent',          es: 'A · Excelente' },
  eval_grade_b:      { ko: 'B · 양호',            en: 'B · Good',               es: 'B · Bueno' },
  eval_grade_c:      { ko: 'C · 보통',            en: 'C · Average',            es: 'C · Regular' },
  eval_grade_d:      { ko: 'D · 개선 필요',       en: 'D · Needs Improvement',  es: 'D · Necesita Mejorar' },
  eval_grade_f:      { ko: 'F · 미흡',            en: 'F · Poor',               es: 'F · Insuficiente' },
  eval_no_data:      { ko: '평가할 데이터가 없습니다.', en: 'No data to evaluate.', es: 'Sin datos para evaluar.' },
  eval_emp_th_name:  { ko: '직원',                en: 'Employee',               es: 'Empleado' },
  eval_emp_th_total: { ko: '담당',                en: 'Tasks',                  es: 'Tareas' },
  eval_emp_th_done:  { ko: '완료',                en: 'Done',                   es: 'Hecho' },
  eval_emp_th_photo: { ko: '사진',                en: 'Photos',                 es: 'Fotos' },
  eval_emp_th_iss:   { ko: '문제',                en: 'Issues',                 es: 'Probl.' },
  eval_emp_th_score: { ko: '점수',                en: 'Score',                  es: 'Puntaje' },
  eval_emp_th_grade: { ko: '등급',                en: 'Grade',                  es: 'Grado' },
  eval_status:       { ko: '업무 현황',           en: 'Work Status',            es: 'Estado del Trabajo' },

  // 4단계 동기부여 체인
  chain_step1:       { ko: '① 관리자 업무 지시 현황',  en: '① Manager Assignment Status', es: '① Asignación de Gerentes' },
  chain_step2:       { ko: '② 시행자 업무 이행 결과',  en: '② Worker Execution Result',   es: '② Resultado de Ejecución' },
  chain_step3:       { ko: '③ 보상 내역 (산정)',        en: '③ Rewards Calculated',        es: '③ Recompensas Calculadas' },
  chain_step4:       { ko: '④ 보상 시행',                en: '④ Rewards Paid',              es: '④ Recompensas Pagadas' },

  mgr_th_assigner:   { ko: '지시자',           en: 'Assigner',          es: 'Asignador' },
  mgr_th_role:       { ko: '직책',             en: 'Role',              es: 'Rol' },
  mgr_th_count:      { ko: '지시 건수',        en: 'Tasks Issued',      es: 'Tareas Asignadas' },
  mgr_th_workers:    { ko: '직원 수',          en: 'Workers',           es: 'Trabajadores' },
  mgr_th_depts:      { ko: '부문 수',          en: 'Depts.',            es: 'Deptos.' },
  mgr_th_done:       { ko: '완료',             en: 'Done',              es: 'Hecho' },
  mgr_th_pending:    { ko: '미완료',           en: 'Pending',           es: 'Pendientes' },

  reward_th_emp:     { ko: '직원',             en: 'Employee',          es: 'Empleado' },
  reward_th_score:   { ko: '점수',             en: 'Score',             es: 'Puntaje' },
  reward_th_grade:   { ko: '등급',             en: 'Grade',             es: 'Grado' },
  reward_th_points:  { ko: '포인트',           en: 'Points',            es: 'Puntos' },
  reward_th_cash:    { ko: '현금가치 ($)',     en: 'Cash Value ($)',    es: 'Valor en $' },
  reward_th_action:  { ko: '처리',             en: 'Action',            es: 'Acción' },
  reward_th_paid_at: { ko: '지급 시각',        en: 'Paid At',           es: 'Pagado a las' },
  reward_th_paid_by: { ko: '지급자',           en: 'Paid By',           es: 'Pagado Por' },
  reward_btn_pay:    { ko: '✅ 지급',          en: '✅ Pay',             es: '✅ Pagar' },
  reward_btn_unpay:  { ko: '↩ 취소',           en: '↩ Undo',            es: '↩ Deshacer' },
  reward_status_paid:{ ko: '지급 완료',        en: 'Paid',              es: 'Pagado' },
  reward_status_pending: { ko: '미지급',       en: 'Pending',           es: 'Pendiente' },
  reward_no_data:    { ko: '산정할 보상이 없습니다.', en: 'No rewards to calculate.', es: 'Sin recompensas para calcular.' },
  reward_no_paid:    { ko: '아직 지급된 보상이 없습니다.', en: 'No rewards paid yet.', es: 'Aún sin pagos.' },
  reward_no_assigners:{ ko: '오늘 업무 지시 내역이 없습니다.', en: 'No assignments issued today.', es: 'Sin asignaciones hoy.' },
  reward_no_workers: { ko: '오늘 이행 내역이 없습니다.',     en: 'No execution data today.',     es: 'Sin datos de ejecución hoy.' },
  reward_motivation: { ko: '💪 잘한 만큼 보상받습니다',     en: '💪 Earn what you work for',    es: '💪 Recompensa por desempeño' },

  reward_total_pts:  { ko: '총 포인트',        en: 'Total Points',      es: 'Total Puntos' },
  reward_total_cash: { ko: '총 현금',          en: 'Total Cash',        es: 'Total $' },
  reward_pending_n:  { ko: '미지급 건',        en: 'Pending',           es: 'Pendientes' },
  reward_paid_n:     { ko: '지급 완료',        en: 'Paid',              es: 'Pagados' },

  reward_table_legend:{ ko: '등급별 보상 기준 — A: 50pt/$5 · B: 30pt/$3 · C: 15pt/$1 · D~F: 0',
                        en: 'Reward by grade — A: 50pt/$5 · B: 30pt/$3 · C: 15pt/$1 · D~F: 0',
                        es: 'Recompensa por grado — A: 50pt/$5 · B: 30pt/$3 · C: 15pt/$1 · D~F: 0' },
  reward_pay_all:    { ko: '미지급 전체 일괄 지급',        en: 'Pay All Pending',              es: 'Pagar Todo Pendiente' },
  reward_paid_today: { ko: '오늘 지급 완료',                en: 'Paid Today',                   es: 'Pagado Hoy' },
  reward_confirm_pay:{ ko: '지급 처리하시겠습니까?',        en: 'Confirm payment?',             es: '¿Confirmar pago?' },

  // 부문 그리드 진입
  rep_grid_title:    { ko: '부문을 선택하세요',          en: 'Choose a Department',          es: 'Seleccione Departamento' },
  rep_grid_intro:    { ko: '각 부문 카드를 누르면 지시 / 이행 / 보상 / 지급 4단계 체인을 볼 수 있습니다.',
                       en: 'Tap a department card to see the 4-stage chain: assign → execute → reward → pay.',
                       es: 'Toque una tarjeta para ver la cadena de 4 etapas: asignar → ejecutar → recompensa → pagar.' },
  rep_all_depts:     { ko: '🌐 전체 부문 통합 보기',     en: '🌐 All Departments',           es: '🌐 Todos los Departamentos' },
  rep_dept_no_data:  { ko: '이 부문에 오늘 배정된 업무가 없습니다.',
                       en: 'No tasks assigned to this department today.',
                       es: 'Sin tareas en este departamento hoy.' },
  rep_dept_back:     { ko: '← 부문 목록으로',            en: '← Back to Departments',        es: '← Volver a Departamentos' },
  rep_dept_summary:  { ko: '부문 요약',                  en: 'Department Summary',           es: 'Resumen del Depto.' },

  // 7개 평가 그룹
  group_stock_cashier:{ ko: 'STOCK & CASHIER',  en: 'STOCK & CASHIER',  es: 'STOCK & CAJA' },
  group_produce:      { ko: 'PRODUCE',           en: 'PRODUCE',           es: 'FRUTAS Y VERDURAS' },
  group_meat_seafood: { ko: 'MEAT & SEAFOOD',    en: 'MEAT & SEAFOOD',    es: 'CARNE Y MARISCOS' },
  group_kfood:        { ko: 'K FOOD',            en: 'K FOOD',            es: 'COMIDA COREANA' },
  group_sushi:        { ko: 'SUSHI KING',        en: 'SUSHI KING',        es: 'SUSHI KING' },
  group_bbq:          { ko: 'BB.Q CHICKEN',      en: 'BB.Q CHICKEN',      es: 'BB.Q POLLO' },
  group_bakery:       { ko: 'BAKERY',            en: 'BAKERY',            es: 'PANADERÍA' },

  // ===== 오너 평가 시스템 =====
  owner_section:        { ko: '👑 오너 평가 (매장 방문 시 입력)', en: '👑 Owner Evaluation (on-site)', es: '👑 Evaluación Dueño (visita)' },
  owner_intro:          { ko: '오너가 매장 방문 시 1~10 점수로 직접 평가합니다. 부문별 합산 점수가 가장 높은 지점이 보너스 후보가 됩니다.',
                          en: 'Owner scores 1~10 during store visits. The store with the highest score in each department earns the bonus.',
                          es: 'El dueño puntúa 1~10 durante visitas. La tienda con mayor puntaje obtiene el bono.' },
  owner_consistency:    { ko: '꾸준함',           en: 'Consistency',       es: 'Constancia' },
  owner_consistency_d:  { ko: '업무 지시의 꾸준함', en: 'Consistency of assignments', es: 'Constancia en asignar' },
  owner_detail:         { ko: '디테일',           en: 'Detail',            es: 'Detalle' },
  owner_detail_d:       { ko: '지시 내용의 디테일', en: 'Detail of instructions', es: 'Detalle de instrucciones' },
  owner_fulfillment:    { ko: '이행률',           en: 'Fulfillment',       es: 'Cumplimiento' },
  owner_fulfillment_d:  { ko: '회신 보고와 완료의 과정', en: 'Reports & completion process', es: 'Reportes y proceso' },
  owner_eval_total:     { ko: '오너 평가 합계',   en: 'Owner Score Total', es: 'Total Dueño' },
  owner_eval_save:      { ko: '평가 저장',        en: 'Save Evaluation',   es: 'Guardar Evaluación' },
  owner_eval_saved:     { ko: '평가가 저장되었습니다', en: 'Evaluation saved', es: 'Evaluación guardada' },
  owner_eval_note:      { ko: '평가 메모 (선택)', en: 'Note (optional)',   es: 'Nota (opcional)' },
  owner_eval_note_ph:   { ko: '매장 방문 시 관찰 내용', en: 'Observations during visit', es: 'Observaciones de la visita' },
  owner_eval_target:    { ko: '평가 대상 관리자', en: 'Manager to evaluate', es: 'Gerente a evaluar' },
  owner_no_managers:    { ko: '이 부문에 업무를 지시한 관리자가 없습니다.', en: 'No managers assigned tasks in this dept.', es: 'Sin gerentes asignados.' },
  owner_visited_at:     { ko: '평가 시각',        en: 'Evaluated at',      es: 'Evaluado a las' },
  owner_score_display:  { ko: '오너 점수',        en: 'Owner Score',       es: 'Pts Dueño' },

  // 점장 평가 (별도 강조 섹션)
  sm_section:           { ko: '👔 지점장(Store Manager) 평가', en: '👔 Store Manager Evaluation', es: '👔 Evaluación Gerente de Tienda' },
  sm_intro:             { ko: '이 지점의 점장에 대한 평가입니다. 점장 점수는 부문 종합 랭킹에 별도 가중치로 반영됩니다.',
                          en: 'Evaluate this store\'s manager. The score is weighted separately in the department ranking.',
                          es: 'Evaluación del gerente de tienda. Se pondera por separado en el ranking.' },
  sm_name_label:        { ko: '지점장 이름',       en: 'Store Manager Name',es: 'Nombre del Gerente' },
  sm_name_ph:           { ko: '점장 이름 입력',    en: 'Enter manager name',es: 'Nombre del gerente' },
  sm_set_btn:           { ko: '등록',              en: 'Register',          es: 'Registrar' },
  sm_change_btn:        { ko: '변경',              en: 'Change',            es: 'Cambiar' },
  sm_not_set:           { ko: '점장 미등록 — 먼저 점장 이름을 등록하세요.',
                          en: 'Not registered — please set the store manager name first.',
                          es: 'No registrado — primero registre el gerente.' },
  sm_total_label:       { ko: '점장 점수',         en: 'SM Score',          es: 'Pts Gerente' },
  mgr_section:          { ko: '📋 부문 관리자 평가', en: '📋 Department Manager Evaluation', es: '📋 Evaluación Gerentes' },
  mgr_section_intro:    { ko: '이 부문에 업무를 지시한 관리자(들)에 대한 평가입니다.',
                          en: 'Evaluation of managers who assigned tasks in this department.',
                          es: 'Gerentes que asignaron tareas en este depto.' },
  ranking_th_sm:        { ko: '점장 (/30)',       en: 'SM (/30)',          es: 'Gerente (/30)' },
  ranking_th_mgrs:      { ko: '관리자 평균 (/30)', en: 'Mgr Avg (/30)',     es: 'Prom. Gtes (/30)' },

  // ===== 부문별 지점 랭킹 =====
  ranking_section:      { ko: '🏆 부문 전체 지점 랭킹 (실시간)', en: '🏆 Cross-Store Ranking (Live)', es: '🏆 Ranking de Tiendas (Vivo)' },
  ranking_intro:        { ko: '같은 부문에 대한 모든 지점의 점수 비교. 1위 지점이 보너스 후보입니다.',
                          en: 'Compare all stores in this department. The 1st place earns the bonus.',
                          es: 'Comparación de tiendas en este depto. El 1° gana el bono.' },
  ranking_th_rank:      { ko: '순위',             en: 'Rank',              es: 'Rango' },
  ranking_th_store:     { ko: '지점',             en: 'Store',             es: 'Tienda' },
  ranking_th_auto:      { ko: '자동 점수',        en: 'Auto Score',        es: 'Auto' },
  ranking_th_owner:     { ko: '오너 점수 (30점)', en: 'Owner Score (/30)', es: 'Dueño (/30)' },
  ranking_th_total:     { ko: '종합 (100점)',     en: 'Total (/100)',      es: 'Total (/100)' },
  ranking_th_bonus:     { ko: '보너스',           en: 'Bonus',             es: 'Bono' },
  ranking_bonus_winner: { ko: '🏆 1위',           en: '🏆 1st',             es: '🏆 1°' },
  ranking_bonus_runner: { ko: '—',                en: '—',                 es: '—' },
  ranking_no_data:      { ko: '아직 모든 지점의 데이터가 충분하지 않습니다.', en: 'Not enough data across stores yet.', es: 'Aún sin suficientes datos.' },

  // ===== 부문 보드 (동료 업무 공유) =====
  nav_group_board:      { ko: '부문 보드',          en: 'Dept Board',           es: 'Tablero' },
  group_grid_title:     { ko: '부문별 보드',         en: 'Department Boards',    es: 'Tableros por Depto.' },
  group_grid_intro:     { ko: '같은 부문 동료들의 업무를 한 화면에서 볼 수 있습니다. 카드 누르면 그 부문 보드 진입.',
                          en: 'See teammates\' tasks in the same department on one screen. Tap a card to enter.',
                          es: 'Ver tareas de compañeros del mismo depto. Toque una tarjeta para entrar.' },
  group_board_intro:    { ko: '이 부문(그룹)에 속한 모든 업무를 한 곳에 모았습니다. 누가 누구에게 무엇을 지시했고 어떻게 진행되는지 함께 확인하세요.',
                          en: 'All tasks in this department group, in one place. See who assigned what to whom, and how it\'s progressing.',
                          es: 'Todas las tareas de este depto. Vea quién asignó qué y el progreso.' },
  group_board_no_tasks: { ko: '이 부문에 오늘 배정된 업무가 없습니다.', en: 'No tasks assigned in this department today.', es: 'Sin tareas hoy en este depto.' },
  group_board_by_subdept:{ ko: '세부 부문별',       en: 'By Sub-Department',    es: 'Por Sub-Departamento' },
  group_board_by_assigner:{ ko: '지시자별',          en: 'By Assigner',          es: 'Por Asignador' },
  group_board_by_worker:{ ko: '담당자별',            en: 'By Worker',            es: 'Por Trabajador' },
  group_board_my_group: { ko: '🤝 내가 속한 부문',  en: '🤝 My Group',          es: '🤝 Mi Grupo' },
  group_view_mode_subdept:{ ko: '🗂 세부 부문',     en: '🗂 By Dept',           es: '🗂 Por Depto.' },
  group_view_mode_assigner:{ ko: '📝 지시자',       en: '📝 Assigner',          es: '📝 Asignador' },
  group_view_mode_worker:{ ko: '👷 담당자',         en: '👷 Worker',            es: '👷 Trabajador' },
  group_back:           { ko: '← 부문 보드 목록으로',en: '← Back to Boards',     es: '← Volver a Tableros' },
  rep_score_label:   { ko: '점수',                       en: 'Score',                        es: 'Puntaje' },
  rep_tasks_count:   { ko: '업무',                       en: 'Tasks',                        es: 'Tareas' },
  rep_workers_count: { ko: '직원',                       en: 'Workers',                      es: 'Personal' },

  // 직원 명부
  staff_intro:       { ko: '자주 쓰는 직원을 등록하면 배정 시 빠르게 선택할 수 있습니다.',
                       en: 'Register frequent staff to speed up assignments.',
                       es: 'Registre personal frecuente para asignar rápido.' },
  staff_name:        { ko: '이름',                 en: 'Name',                   es: 'Nombre' },
  staff_role:        { ko: '역할',                 en: 'Role',                   es: 'Rol' },
  staff_add:         { ko: '+ 추가',               en: '+ Add',                  es: '+ Agregar' },
  staff_registered:  { ko: '등록된 직원',          en: 'Registered Staff',       es: 'Personal Registrado' },
  staff_empty:       { ko: '등록된 직원 없음',      en: 'No staff registered',    es: 'Sin personal' },

  // 설정
  set_user:          { ko: '현재 사용자',          en: 'Current User',           es: 'Usuario Actual' },
  set_data:          { ko: '데이터',               en: 'Data',                   es: 'Datos' },
  set_export:        { ko: '⬇ 내보내기',           en: '⬇ Export',                es: '⬇ Exportar' },
  set_clean_old:     { ko: '🧹 7일 이전 정리',     en: '🧹 Clear 7+ days',        es: '🧹 Limpiar +7 días' },
  set_clear_all:     { ko: '⚠️ 전체 초기화',        en: '⚠️ Clear all',             es: '⚠️ Borrar todo' },
  set_app_info:      { ko: '김치마트 오프닝/클로징 컨트롤 v2.0\n시프트(오프닝/클로징) · 다국어(KO/EN/ES) · 6지점 · 공지 · 자유 사진 리포트\n오프라인 동작. 모든 데이터는 이 디바이스에만 저장됩니다.',
                       en: 'Kimchi Mart Opening/Closing Control v2.0\nShift (Opening/Closing) · Multi-lang (KO/EN/ES) · 6 stores · Notices · Free photo reports\nOffline. All data stored on this device only.',
                       es: 'Control Apertura/Cierre Kimchi Mart v2.0\nTurno (Apertura/Cierre) · Multi-idioma · 6 tiendas · Avisos · Reportes con foto\nFuera de línea. Datos solo en este dispositivo.' },

  // 공통
  common_no:         { ko: '없음',                  en: 'None',                   es: 'Ninguno' },
  common_all_started:{ ko: '모든 업무 시작됨',      en: 'All tasks started',      es: 'Todas iniciadas' },
  common_required:   { ko: '필수',                  en: 'required',               es: 'requerido' },
  common_assign_btn: { ko: '+ 배정',                en: '+ Assign',               es: '+ Asignar' },
  common_dept_no_tasks:{ ko: '이 부문에 배정된 업무가 없습니다.',
                       en: 'No tasks in this department.',
                       es: 'Sin tareas en este depto.' },

  // 마감 / 시프트별 컨텍스트
  shift_open_full:   { ko: '오프닝',                en: 'Opening',                es: 'Apertura' },
  shift_close_full:  { ko: '클로징',                en: 'Closing',                es: 'Cierre' },

  // 확인 다이얼로그
  confirm_delete:    { ko: '삭제하시겠습니까?',     en: 'Delete?',                es: '¿Eliminar?' },
  confirm_reassign:  { ko: '재지시하시겠습니까?',   en: 'Reassign?',              es: '¿Reasignar?' },
  confirm_photo_del: { ko: '사진을 삭제하시겠습니까?', en: 'Delete photo?',        es: '¿Eliminar foto?' },
  confirm_clear_old: { ko: '7일 이전 데이터 삭제?', en: 'Delete data older than 7 days?', es: '¿Borrar datos +7 días?' },
  confirm_clear_all: { ko: '정말 전체 데이터 삭제?', en: 'Really delete all data?', es: '¿Borrar todos los datos?' },
  confirm_clear_again: { ko: '한 번 더 확인합니다. 모두 삭제됩니다.',
                         en: 'Confirm once more. Everything will be deleted.',
                         es: 'Confirme otra vez. Todo se borrará.' },

  // 진행률 / 라벨
  badge_assigned:    { ko: '배정됨',                en: 'assigned',               es: 'asignado(s)' },
  cur_assigned:      { ko: '현재',                  en: 'Currently',              es: 'Actualmente' }
});

function deptName(d, lang) {
  if (!d) return '';
  lang = lang || 'ko';
  return (KMOCS_DEPT_I18N[d.id] && KMOCS_DEPT_I18N[d.id][lang]) || d.name;
}
function deptSub(d, lang) {
  if (!d) return '';
  lang = lang || 'ko';
  return (KMOCS_DEPT_SUB_I18N[d.id] && KMOCS_DEPT_SUB_I18N[d.id][lang]) || d.nameSub;
}

// ----- 그룹 라벨 i18n -----
Object.assign(I18N, {
  group_common_opening: { ko: '공통(오프닝)', en: 'Common (Opening)', es: 'Común (Apertura)' },
  group_common_closing: { ko: '공통(클로징)', en: 'Common (Closing)', es: 'Común (Cierre)' }
});

// ============================================================
// 부문별 체크리스트 항목 다국어 (15부문 × 2시프트 × 3언어)
// ============================================================
const KMOCS_DEPT_EXTRAS_I18N = {
  produce: {
    // 출처: PRODUCE_OPS_MANUAL (매뉴얼 Table 0/Table 16-20 기반)
    // 사용자 직접 제공 (2026-04-25). 8 항목 (GROCERY 1-8 공통).
    opening: {
      ko: ['기존 제품들 진열 정리','기존 제품들 가격표 확인','진열 매대 제품 리스탁','매대 제품 종류별 통합 여부 확인','제품 유통기한 및 폐기 확인','벤더별 제품 오더 확인','매장 바닥 및 디스플레이 기구 및 장비 청결','냉장·냉동 온도 확인'],
      en: ['Arrange existing product displays','Verify existing product price tags','Restock display shelves','Verify product consolidation by category','Check expiration dates & disposal','Verify orders by vendor','Floor, display fixtures & equipment cleanliness','Refrigerator / freezer temperature check'],
      es: ['Acomodo de productos en exhibición','Verificar etiquetas de precio','Reabastecer estantes','Verificar consolidación por categoría','Verificar fechas de caducidad y desecho','Verificar pedidos por proveedor','Limpieza de piso, vitrinas y equipo','Verificar temperatura refrigerador / congelador']
    },
    closing: {
      ko: ['모든 청과 최종 품질 확인','신선도 떨어진 제품 제거','온도 민감 제품 냉장고 보관','모든 진열대 닦기','바닥 쓸고 닦기','냉장고 FIFO 정리','온도 기록부 완성','폐기 기록 완성','청과 폐기물/퇴비 배출','부족재고 품목 발주 메모','장비 문제 보고','특이사항 보고'],
      en: ['Final quality check of all produce','Remove any items past prime','Store temperature-sensitive items in cooler','Wipe down all display areas','Sweep and mop floor thoroughly','Check cooler is organized (FIFO)','Complete Temperature Log','Complete Waste Log','Take out produce waste/compost','Note low-stock items for ordering','Report any equipment issues','Special Issue Report'],
      es: ['Verificación final de calidad','Retirar productos pasados','Almacenar productos sensibles en enfriador','Limpiar todas las áreas de exhibición','Barrer y trapear pisos','Organizar enfriador (PEPS)','Completar Bitácora de Temperatura','Completar Registro de Desperdicios','Sacar desechos/composta','Anotar productos con bajo stock para pedidos','Reportar problemas de equipo','Reporte de Incidencias']
    }
  },
  meat: {
    // 출처: MEAT_OPS_MANUAL (매뉴얼 Table 0/Table 13-14 기반)
    opening: {
      ko: ['기존 제품들 진열 정리','기존 제품들 가격표 확인','진열 매대 제품 리스탁','매대 제품 종류별 통합 여부 확인','제품 유통기한 및 폐기 확인','스페셜 컷 메뉴 전시 여부','벤더별 제품 오더 확인','매장 바닥 및 디스플레이 기구 및 장비 청결','냉장·냉동 온도 확인'],
      en: ['Arrange existing product displays','Verify existing product price tags','Restock display shelves','Verify product consolidation by category','Check expiration dates & disposal','Special cut menu display check','Verify orders by vendor','Floor, display fixtures & equipment cleanliness','Refrigerator / freezer temperature check'],
      es: ['Acomodo de productos en exhibición','Verificar etiquetas de precio','Reabastecer estantes','Verificar consolidación por categoría','Verificar fechas de caducidad y desecho','Verificar exhibición de cortes especiales','Verificar pedidos por proveedor','Limpieza de piso, vitrinas y equipo','Verificar temperatura refrigerador / congelador']
    },
    closing: {
      ko: ['최종 온도 기록 (온도기록부)','전시 육류 모두 덮개/포장','모든 육류 냉장고 보관','모든 도마/칼 세척/소독','모든 작업대 닦기/소독','진열장 내부/외부 청소','바닥 쓸고 닦기','쓰레기 배출 및 쓰레기통 소독','워크인 냉장고 FIFO 정리','특이사항 보고','주간 KPI 기입','진열장 조명 끄기'],
      en: ['Record final temperatures in Temperature Log','Cover or wrap all displayed meat properly','Store all meat products in walk-in cooler','Clean and sanitize ALL cutting boards and knives','Wipe down and sanitize all work surfaces','Clean meat display case thoroughly (inside & outside)','Sweep and mop entire floor area','Take out trash and sanitize trash cans','Organize walk-in cooler — FIFO arrangement','Special Issue Report','Complete Weekly KPI entry','Turn off display case lights (if applicable)'],
      es: ['Registrar temperaturas finales en Bitácora','Cubrir o envolver toda la carne exhibida','Almacenar todos los productos en cuarto frío','Limpiar y sanitizar TODAS las tablas y cuchillos','Limpiar y sanitizar todas las superficies','Limpiar exhibidor completamente (interior y exterior)','Barrer y trapear toda el área','Sacar basura y sanitizar botes','Organizar cuarto frío — arreglo PEPS','Reporte de Incidencias','Completar entrada KPI semanal','Apagar luces del exhibidor (si aplica)']
    }
  },
  seafood: {
    // 출처: SEAFOOD_OPS_MANUAL (매뉴얼 Table 0/Table 10 기반)
    opening: {
      ko: ['기존 제품들 진열 정리','기존 제품들 가격표 확인','진열 매대 제품 리스탁','매대 제품 종류별 통합 여부 확인','제품 유통기한 및 폐기 확인','벤더별 제품 오더 확인','매장 바닥 및 디스플레이 기구 및 장비 청결','냉장·냉동 온도 확인'],
      en: ['Arrange existing product displays','Verify existing product price tags','Restock display shelves','Verify product consolidation by category','Check expiration dates & disposal','Verify orders by vendor','Floor, display fixtures & equipment cleanliness','Refrigerator / freezer temperature check'],
      es: ['Acomodo de productos en exhibición','Verificar etiquetas de precio','Reabastecer estantes','Verificar consolidación por categoría','Verificar fechas de caducidad y desecho','Verificar pedidos por proveedor','Limpieza de piso, vitrinas y equipo','Verificar temperatura refrigerador / congelador']
    },
    closing: {
      ko: ['최종 온도 기록 (온도기록부)','전시 해산물 모두 덮개/포장','신선 해산물 얼음과 함께 냉장고 보관','냉동품 냉동고 안전 보관 확인','모든 도마/도구 세척/소독','모든 작업대 세척/소독','진열장 철저 청소','모든 얼음 적절히 폐기','바닥 쓸고 닦기','쓰레기 배출 및 쓰레기통 소독','특이사항 보고','품질 문제 관리자 보고'],
      en: ['Record final temperatures in Temperature Log','Cover or wrap all displayed seafood','Store all fresh seafood properly iced in cooler','Verify all frozen items secure in freezer','Clean and sanitize ALL cutting boards and tools','Clean and sanitize all work surfaces','Clean display case thoroughly','Dispose of ALL ice properly','Sweep and mop floor area','Take out trash and sanitize cans','Special Issue Report','Report any quality concerns to manager'],
      es: ['Registrar temperaturas finales en Bitácora','Cubrir o envolver todos los mariscos','Almacenar frescos con hielo en enfriador','Verificar congelados seguros en congelador','Limpiar y sanitizar TODAS las tablas y herramientas','Limpiar y sanitizar superficies','Limpiar exhibidor completamente','Desechar TODO el hielo correctamente','Barrer y trapear pisos','Sacar basura y sanitizar botes','Reporte de Incidencias','Reportar problemas de calidad al gerente']
    }
  },
  grocery: {
    // 사용자 직접 제공 (2026-04-25). 9 항목.
    opening: {
      ko: ['기존 제품들 진열 정리','기존 제품들 가격표 확인','진열 매대 제품 리스탁','매대 제품 종류별 통합 여부 확인','제품 유통기한 및 폐기 확인','벤더별 제품 오더 확인','매장 바닥 및 디스플레이 기구 및 장비 청결','냉장·냉동 온도 확인','POS 시스템 이상 유무 확인'],
      en: ['Arrange existing product displays','Verify existing product price tags','Restock display shelves','Verify product consolidation by category','Check expiration dates & disposal','Verify orders by vendor','Floor, display fixtures & equipment cleanliness','Refrigerator / freezer temperature check','POS system check'],
      es: ['Acomodo de productos en exhibición','Verificar etiquetas de precio','Reabastecer estantes','Verificar consolidación por categoría','Verificar fechas de caducidad y desecho','Verificar pedidos por proveedor','Limpieza de piso, vitrinas y equipo','Verificar temperatura refrigerador / congelador','Verificar sistema POS']
    },
    closing: {
      ko: ['빈 진열대 / 부족 상품 기록','내일 채워야 할 상품 리스트','백룸 정리','유통기한 임박 상품 확인','파손 상품 기록','카트 / 박스 / 팔레트 정리','특이사항 보고'],
      en: ['Empty shelf / shortage log','Tomorrow restocking list','Backroom cleanup','Near-expiry items check','Damaged item log','Cart / box / pallet cleanup','Special Issue Report'],
      es: ['Estantes vacíos / registro de faltantes','Lista de reposición mañana','Limpieza del almacén','Productos próximos a vencer','Registro de daños','Carros / cajas / pallets','Reporte de Incidencias']
    }
  },
  frozen: {
    opening: {
      ko: ['냉동고 온도 확인 (0°F 이하)','문 닫힘 / 가스킷 상태','성에 과다 / 이상 소리 확인','녹았다 다시 언 흔적 확인','박스 파손 / 누수 확인','가격표 / 라벨 확인'],
      en: ['Freezer temp check (≤ 0°F)','Door seal / gasket','Excess frost / odd noise','Refrozen / thaw signs','Box damage / leak check','Price tag / label check'],
      es: ['Temp. del congelador (≤ 0°F)','Sellos de puertas','Escarcha / ruidos extraños','Signos de descongelación','Daños / fugas en cajas','Etiquetas / precios']
    },
    closing: {
      ko: ['냉동고 온도 최종 확인 (0°F 이하)','문 닫힘 / 가스킷 상태 재점검','진열 정리 / 빈자리 기록','폐기 상품 처리','바닥 / 주변 청소','내일 채울 상품 기록','특이사항 보고'],
      en: ['Final freezer temp (≤ 0°F)','Re-check door seals','Display tidy / log empty spots','Dispose of waste items','Floor & area cleanup','Log items to fill tomorrow','Special Issue Report'],
      es: ['Temp. final del congelador (≤ 0°F)','Revisar sellos de puertas','Acomodar / registrar vacíos','Disposición de pérdidas','Limpieza del área','Productos para mañana','Reporte de Incidencias']
    }
  },
  refrigerated: {
    opening: {
      ko: ['냉장 온도 확인 (32–40°F)','유통기한 임박 상품 앞당김','누수 / 성에 / 소음 확인','문 가스킷 상태 확인','파손 / 부풀어진 포장 확인','진열 정리 / 가격표 확인'],
      en: ['Refrigerator temp (32–40°F)','Pull near-expiry items forward','Leak / frost / noise check','Door gasket check','Damaged / bloated packaging','Tidy display / price tags'],
      es: ['Temp. refrigerador (32–40°F)','Adelantar productos por vencer','Fugas / escarcha / ruido','Sellos de puertas','Empaques dañados','Acomodar / etiquetas']
    },
    closing: {
      ko: ['냉장 온도 최종 확인 (32–40°F)','유통기한 지난 상품 폐기 기록','진열 마감 / 앞당김','문 닫힘 / 가스킷 점검','바닥 누수 / 청소','내일 채울 상품 기록','특이사항 보고'],
      en: ['Final refrigerator temp (32–40°F)','Log expired items disposed','Final facing / pull-forward','Door close / gasket check','Floor leak / cleaning','Log items to fill tomorrow','Special Issue Report'],
      es: ['Temp. final del refrigerador','Registro de vencidos retirados','Acomodo final','Cierre de puertas / sellos','Fugas / limpieza del piso','Productos para mañana','Reporte de Incidencias']
    }
  },
  cashier: {
    opening: {
      ko: ['계산대 오픈 / POS 작동 확인','카드 단말기 작동 확인','거스름돈 / 현금 준비','쇼핑백 / 영수증 용지 확인','환불 / 반품 규정 숙지','멤버십 안내 준비'],
      en: ['Cashier open / POS check','Card terminal check','Change / cash prep','Bags / receipt paper','Refund / return policy review','Membership info ready'],
      es: ['Apertura caja / POS','Verificar terminal de tarjetas','Cambio / efectivo','Bolsas / papel de recibo','Política de reembolsos','Info de membresía']
    },
    closing: {
      ko: ['현금 마감 / 카운트','카드 결제 문제 / 거부 건 확인','환불 / 반품 내역 정리','고객 클레임 보고','계산대 청소 / 컨베이어 청소','POS 종료 / 단말기 잠금','다음 날 거스름돈 / 용지 준비','특이사항 보고'],
      en: ['Cash close / count','Card decline issue check','Refund / return log','Customer claim report','Register / conveyor cleaning','POS shutdown / terminal lock','Next day change / paper prep','Special Issue Report'],
      es: ['Cierre de caja / conteo','Problemas con tarjetas','Registro de reembolsos','Reporte de quejas','Limpieza caja / cinta','Cerrar POS / bloquear terminal','Cambio / papel para mañana','Reporte de Incidencias']
    }
  },
  receiving: {
    opening: {
      ko: ['입고 예정 벤더 확인','입고 공간 / 팔레트 확보','냉장 / 냉동 입고 준비','인보이스 확인 준비','검수 담당자 확인','안전 통로 확보'],
      en: ['Vendor schedule check','Receiving space / pallet ready','Cold/frozen receiving prep','Invoice check setup','Inspector assignment','Safe path clearance'],
      es: ['Horario de proveedores','Espacio / pallets listos','Prep. recepción frío','Preparar facturas','Asignar inspector','Pasillo seguro']
    },
    closing: {
      ko: ['당일 입고 벤더 / 수량 기록','누락 상품 / 파손 상품 기록','가격 차이 / 인보이스 문제 기록','인보이스 사무실 전달 여부 확인','입고장 청소 / 미정리 상품 점검','내일 입고 예정 벤더 확인','특이사항 보고'],
      en: ['Daily vendor / quantity log','Missing / damaged log','Price diff / invoice issues','Invoice handed to office','Receiving area cleanup','Tomorrow vendor check','Special Issue Report'],
      es: ['Registro de proveedores / cantidades','Faltantes / dañados','Diferencias de precio / facturas','Facturas a oficina','Limpieza del área','Proveedores de mañana','Reporte de Incidencias']
    }
  },
  stock: {
    opening: {
      ko: ['진열 부족 상품 확인','백룸 재고 확인','선입선출 (FIFO) 확인','세일 상품 우선 진열','통로 / 카트 정리','박스 제거'],
      en: ['Low-stock display check','Backroom inventory','FIFO check','Priority sale display','Aisle / cart cleanup','Remove boxes'],
      es: ['Productos con poco stock','Inventario almacén','Verificar FIFO','Oferta primero','Pasillos / carros','Retirar cajas']
    },
    closing: {
      ko: ['오늘 진열 못한 상품 기록','내일 우선 진열 상품 리스트','백룸 정리 / 동선 확보','유통기한 임박 / 파손 상품 점검','카트 / 박스 / 팔레트 정리','리프트 / 작업 도구 보관','특이사항 보고'],
      en: ['Today\'s unstocked log','Tomorrow priority list','Backroom cleanup / path','Near-expiry / damage check','Cart / box / pallet cleanup','Lift / tool storage','Special Issue Report'],
      es: ['Productos no acomodados hoy','Prioridad para mañana','Limpieza almacén / pasillo','Próximos a vencer / dañados','Carros / cajas / pallets','Guardar montacargas / herramientas','Reporte de Incidencias']
    }
  },
  price: {
    opening: {
      ko: ['오늘 세일 상품 확인','POS 가격 / 진열 가격 일치 확인','가격표 부착 / ESL 업데이트','이전 세일 가격표 제거','가격 오류 점검 / 수정','고객 가격 클레임 사전 점검'],
      en: ['Today\'s sale items','POS / display price match','Tag posting / ESL update','Remove old sale tags','Price error check / fix','Customer claim prep'],
      es: ['Ofertas del día','Coincidencia POS / etiqueta','Etiquetas / actualización ESL','Retirar etiquetas viejas','Errores de precio','Quejas de clientes']
    },
    closing: {
      ko: ['당일 가격 오류 / 클레임 기록','수정 완료 상품 기록','미수정 상품 / 후속 작업 리스트','내일 세일 변경 상품 확인','오늘 ESL 업데이트 실패 상품','점장에게 가격 종합 보고','특이사항 보고'],
      en: ['Daily price error / claim log','Corrected item log','Pending corrections list','Tomorrow sale changes','ESL update failures today','Manager price report','Special Issue Report'],
      es: ['Errores / quejas del día','Productos corregidos','Pendientes','Cambios de oferta mañana','Fallas ESL hoy','Reporte al gerente','Reporte de Incidencias']
    }
  },
  sushi: {
    // 출처: SUSHI_KING_OPS_V2 (매뉴얼 Table 0/Table 26-27 기반)
    opening: {
      ko: ['기존 제품들 진열 정리','기존 제품들 가격표 확인','제품 유통기한 및 폐기 확인','필요 제품 오더 확인','업무 지역 바닥 및 디스플레이 기구 및 장비 청결','냉장·냉동 온도 확인'],
      en: ['Arrange existing product displays','Verify existing product price tags','Check expiration dates & disposal','Verify required product orders','Work area floor, fixtures & equipment cleanliness','Refrigerator / freezer temperature check'],
      es: ['Acomodo de productos en exhibición','Verificar etiquetas de precio','Verificar fechas de caducidad y desecho','Verificar pedidos necesarios','Limpieza del área de trabajo, vitrinas y equipo','Verificar temperatura refrigerador / congelador']
    },
    closing: {
      ko: ['3:50 PM 주문 마감','남은 주문 완료','최종 온도 기록','어제 생선 전량 사용/폐기 확인','오늘 신선 생선만 보관 (날짜/시간 라벨)','밥 전량 폐기 — 익일 보관 불가','모든 도마/칼 소독','진열장 2대 철저 청소','바닥 닦기','쓰레기통 비우기','현금 점검 및 정산','입금 준비 + 금고 잠금','장비 끄기','보안 설정 + 문 잠금','생산보고서 작성','내일용 재고 기록','특이사항 보고'],
      en: ['Stop accepting orders at 3:50 PM','Complete all remaining orders','Record final temperatures','Verify ALL yesterday’s display fish used or discarded','Store ONLY today’s fresh fish for tomorrow (label date/time)','Discard ALL rice — CANNOT be stored overnight','Sanitize ALL cutting boards and knives','Clean both display cases thoroughly','Mop all floors','Empty all trash cans','Cash count and reconciliation','Prepare deposit + Lock safe','Turn off all equipment','Arm security + Lock doors','Complete Production Report','Complete Leftover Inventory for tomorrow','Special Issue Report'],
      es: ['Dejar de aceptar pedidos a las 3:50 PM','Completar pedidos pendientes','Registrar temperaturas finales','Verificar pescado de ayer usado o descartado','Almacenar SOLO pescado fresco de hoy (etiquetar)','Descartar TODO el arroz','Sanitizar tablas y cuchillos','Limpiar ambos exhibidores','Trapear pisos','Vaciar basura','Conteo de caja','Preparar depósito + Cerrar caja fuerte','Apagar equipo','Activar seguridad + Cerrar puertas','Completar Reporte Producción','Completar Inventario Sobrante','Reporte de Incidencias']
    }
  },
  bbq: {
    // 출처: BBQ_CHICKEN_OPS_V2 (매뉴얼 Table 0/Table 21-23 기반)
    opening: {
      ko: ['전 재료 인벤토리','치킨 시즈닝 및 다음 날 영업 수량 준비','업무 지역 바닥 및 디스플레이 기구 및 장비 청결','POS 및 각종 배송 앱 연결 확인','메인 재료 (튀김 기름·파우더·소스·생닭) 2차 확인','유니폼 확인','멤버 근태 확인 및 백업 유무','냉장·냉동 온도 확인'],
      en: ['Full ingredient inventory','Chicken seasoning & tomorrow’s quantity prep','Work area floor, fixtures & equipment cleanliness','POS & delivery app connection check','Main ingredients double-check (oil, powder, sauce, raw chicken)','Uniform check','Staff attendance & backup availability','Refrigerator / freezer temperature check'],
      es: ['Inventario completo de ingredientes','Sazonado de pollo y prep para mañana','Limpieza del área de trabajo, vitrinas y equipo','Verificar POS y apps de entrega','Verificar ingredientes principales (aceite, polvo, salsa, pollo crudo)','Verificar uniforme','Asistencia y respaldo del personal','Verificar temperatura refrigerador / congelador']
    },
    closing: {
      ko: ['마지막 주문 8:00 PM','8:15 PM 프라이어 끄기','기름 <150°F까지 대기 (1시간 이상!)','기름 배출','바스켓 세척','프라이어 내부 청소','내일용 새 기름 추가','생산보고서 작성','매출보고서 작성','오더기록 작성','UMAGA 최종전달','현금점검 + 입금 + 금고','장비 끄기','보안설정 + 문잠금','퇴근: 프라이 ___:___ | 준비 ___:___ | 캐셔 ___:___','특이사항 보고'],
      en: ['Last order call at 8:00 PM','Turn off fryers at 8:15 PM','Wait for oil <150°F before cleaning (1 hour minimum!)','Drain oil into disposal container','Scrub fryer baskets thoroughly','Clean fryer interior','Add fresh oil for tomorrow','Complete Production Report','Complete Revenue Report','Complete Order Log','Final excess delivery to UMAGA','Cash count and reconciliation','Prepare deposit + Lock safe','Turn off all equipment','Arm security + Lock doors','Staff departure: Fryer Cook ___:___ | Prep ___:___ | Cashier ___:___','Special Issue Report'],
      es: ['Último pedido 8:00 PM','Apagar freidoras 8:15 PM','Esperar aceite <150°F (1 hora mín!)','Drenar aceite','Fregar canastas','Limpiar interior freidora','Agregar aceite fresco','Completar Reporte Producción','Completar Reporte Ingresos','Completar Registro Pedidos','Entrega final UMAGA','Conteo caja + Depósito + Caja fuerte','Apagar equipo','Seguridad + Cerrar','Salida: Cocinero ___:___ | Prep ___:___ | Cajero ___:___','Reporte de Incidencias']
    }
  },
  yumsem: {
    // K-FOOD 그룹 (사용자 직접 제공 2026-04-25). 11 항목.
    opening: {
      ko: ['기존 제품들 진열 정리','기존 제품들 가격표 확인','제품 유통기한 및 폐기 확인','필요 제품 오더 확인','인기 제품 제조 유무 확인','김치 및 반찬 등 대포장 확인','업무 지역 바닥 및 디스플레이 기구 및 장비 청결','냉장·냉동 온도 확인','POS 및 각종 배송 앱 연결 확인','유니폼 확인','멤버 근태 확인 및 백업 유무'],
      en: ['Arrange existing product displays','Verify existing product price tags','Check expiration dates & disposal','Verify required product orders','Verify production of popular items','Verify bulk packaging (kimchi, banchan)','Work area floor, fixtures & equipment cleanliness','Refrigerator / freezer temperature check','POS & delivery app connection check','Uniform check','Staff attendance & backup availability'],
      es: ['Acomodo de productos en exhibición','Verificar etiquetas de precio','Verificar fechas de caducidad y desecho','Verificar pedidos necesarios','Verificar producción de productos populares','Verificar empaque grande (kimchi, banchan)','Limpieza del área de trabajo, vitrinas y equipo','Verificar temperatura refrigerador / congelador','Verificar POS y apps de entrega','Verificar uniforme','Asistencia y respaldo del personal']
    },
    closing: {
      ko: ['남은 재료 / 폐기 기록','인기 / 부진 메뉴 기록','작업대 / 조리 장비 청소','장비 전원 종료 / 가스 차단','내일 재료 부족 / 발주 보고','프랜차이즈 기준 준수 확인','특이사항 보고'],
      en: ['Leftover ingredients / waste','Popular / slow menu log','Surface / equipment cleaning','Power off / gas shutoff','Tomorrow shortage / order log','Franchise standards check','Special Issue Report'],
      es: ['Ingredientes sobrantes / pérdidas','Menús populares / lentos','Limpieza área / equipo','Apagar equipos / gas','Faltantes / pedido mañana','Estándares de franquicia','Reporte de Incidencias']
    }
  },
  umaga: {
    // K-FOOD 그룹 (사용자 직접 제공 2026-04-25). 11 항목.
    opening: {
      ko: ['기존 제품들 진열 정리','기존 제품들 가격표 확인','제품 유통기한 및 폐기 확인','필요 제품 오더 확인','인기 제품 제조 유무 확인','김치 및 반찬 등 대포장 확인','업무 지역 바닥 및 디스플레이 기구 및 장비 청결','냉장·냉동 온도 확인','POS 및 각종 배송 앱 연결 확인','유니폼 확인','멤버 근태 확인 및 백업 유무'],
      en: ['Arrange existing product displays','Verify existing product price tags','Check expiration dates & disposal','Verify required product orders','Verify production of popular items','Verify bulk packaging (kimchi, banchan)','Work area floor, fixtures & equipment cleanliness','Refrigerator / freezer temperature check','POS & delivery app connection check','Uniform check','Staff attendance & backup availability'],
      es: ['Acomodo de productos en exhibición','Verificar etiquetas de precio','Verificar fechas de caducidad y desecho','Verificar pedidos necesarios','Verificar producción de productos populares','Verificar empaque grande (kimchi, banchan)','Limpieza del área de trabajo, vitrinas y equipo','Verificar temperatura refrigerador / congelador','Verificar POS y apps de entrega','Verificar uniforme','Asistencia y respaldo del personal']
    },
    closing: {
      ko: ['오늘 생산 완료 / 미완료 상품 기록','폐기 상품 기록 (수량 / 금액)','남은 원재료 기록','내일 생산 필요 상품 리스트','라벨 오류 / 유통기한 점검','냉장·냉동 보관 상태 확인','작업장 청소 / 조리 도구 위생','장비 전원 종료','특이사항 보고'],
      en: ['Today\'s production complete/incomplete log','Waste log (quantity / cost)','Remaining raw material log','Tomorrow production needs','Label / expiration error check','Cold storage condition','Kitchen cleaning / utensil hygiene','Equipment power off','Special Issue Report'],
      es: ['Producción completa/incompleta hoy','Pérdidas (cantidad/costo)','Materia prima restante','Necesidades para mañana','Errores de etiqueta','Estado almacén frío','Limpieza cocina / utensilios','Apagar equipos','Reporte de Incidencias']
    }
  },
  bakery: {
    opening: {
      ko: ['오늘 생산할 빵 종류 확인','반죽 상태 확인','오븐 / 발효기 작동 확인','진열대 청소','포장 용기 / 라벨 준비','유통기한 라벨 확인'],
      en: ['Today\'s bread types','Dough status check','Oven / proofer check','Display cleaning','Container / label prep','Expiration label check'],
      es: ['Tipos de pan del día','Estado de la masa','Horno / fermentadora','Limpieza vitrina','Envases / etiquetas','Etiquetas de vencimiento']
    },
    closing: {
      ko: ['판매 완료 / 남은 상품 기록','할인 또는 폐기 상품 기록','내일 생산 계획 / 반죽 준비','원재료 부족 보고','오븐 / 발효기 / 장비 청소','진열대 청소','작업장 마감 / 가스 차단','특이사항 보고'],
      en: ['Sold-out / leftover log','Discount or waste log','Tomorrow plan / dough prep','Material shortage report','Oven / proofer / equipment cleaning','Display cleaning','Kitchen close / gas shutoff','Special Issue Report'],
      es: ['Vendido / sobrantes','Descuentos o pérdidas','Plan mañana / masa','Faltantes','Limpiar horno / fermentadora','Limpieza vitrina','Cierre / corte de gas','Reporte de Incidencias']
    }
  }
};

// Lang 받는 부문 extras 헬퍼
function getDeptExtrasByLang(deptId, shift, lang) {
  lang = lang || 'ko';
  const map = KMOCS_DEPT_EXTRAS_I18N[deptId];
  if (!map) return getDeptExtras(deptId, shift);
  const sh = map[shift] || map.opening;
  return sh[lang] || sh.ko || [];
}

// ============================================================
//  매뉴얼 허브 (메인 페이지 6대 부문 카드 + STORE MANAGER REPORT)
// ============================================================

// 부문 매뉴얼 파일 매핑 (manuals/ 폴더 내 docx)
const KMOCS_MANUAL_FILES = {
  PRODUCE: { ko: 'manuals/PRODUCE_KO.docx', en: 'manuals/PRODUCE_EN.docx', es: 'manuals/PRODUCE_ES.docx' },
  MEAT:    { ko: 'manuals/MEAT_KO.docx',    en: 'manuals/MEAT_EN.docx',    es: 'manuals/MEAT_ES.docx' },
  SEAFOOD: { ko: 'manuals/SEAFOOD_KO.docx', en: 'manuals/SEAFOOD_EN.docx', es: 'manuals/SEAFOOD_ES.docx' },
  SUSHI:   { ko: 'manuals/SUSHI_KO.docx',   en: 'manuals/SUSHI_EN.docx',   es: 'manuals/SUSHI_ES.docx' },
  BBQ:     { ko: 'manuals/BBQ_KO.docx',     en: 'manuals/BBQ_EN.docx',     es: 'manuals/BBQ_ES.docx' },
  UMAGA:   { ko: 'manuals/UMAGA_KO.docx',   en: 'manuals/UMAGA_EN.docx',   es: 'manuals/UMAGA_ES.docx' },
  // MANAGER 매뉴얼은 KO/ES 미보유 → EN으로 fallback (추후 KO/ES 추가 시 매핑 갱신)
  MANAGER: { ko: 'manuals/MANAGER_DAILY_CHECKLIST.docx', en: 'manuals/MANAGER_DAILY_CHECKLIST.docx', es: 'manuals/MANAGER_DAILY_CHECKLIST.docx' }
};

// 메인 페이지 6대 부문 그리드 (앱의 첫 진입 카드)
const KMOCS_MANUAL_HUB = [
  { id: 'grocery', icon: '🛒', color: '#a16207',
    name: { ko: 'GROCERY', en: 'GROCERY', es: 'GROCERY' },
    desc: { ko: '그로서리 / 일반 식품',           en: 'Grocery / General Food',     es: 'Abarrotes' },
    manuals: [],
    deptIds: ['grocery', 'stock', 'cashier']
  },
  { id: 'produce', icon: '🥬', color: '#16a34a',
    name: { ko: 'PRODUCE', en: 'PRODUCE', es: 'PRODUCE' },
    desc: { ko: '농산 / 야채 · 과일',              en: 'Produce / Vegetables · Fruits', es: 'Frutas y Verduras' },
    manuals: ['PRODUCE'],
    deptIds: ['produce']
  },
  { id: 'meat_seafood', icon: '🥩', color: '#dc2626',
    name: { ko: 'MEAT & SEAFOOD', en: 'MEAT & SEAFOOD', es: 'CARNE Y MARISCOS' },
    desc: { ko: '정육 · 수산',                     en: 'Meat · Seafood',             es: 'Carne · Mariscos' },
    manuals: ['MEAT', 'SEAFOOD'],
    deptIds: ['meat', 'seafood']
  },
  { id: 'kfood', icon: '🍱', color: '#b91c1c',
    name: { ko: 'K-FOOD', en: 'K-FOOD', es: 'K-FOOD' },
    desc: { ko: '반찬 · 김치 · 김밥 · 양념육',     en: 'Banchan · Kimchi · Kimbap · Marinated Meat', es: 'Banchan · Kimchi · Kimbap' },
    manuals: ['UMAGA'],
    deptIds: ['umaga', 'yumsem']
  },
  { id: 'sushi', icon: '🍣', color: '#0891b2',
    name: { ko: 'SUSHI KING', en: 'SUSHI KING', es: 'SUSHI KING' },
    desc: { ko: '일식 / 스시 / 사시미',           en: 'Japanese / Sushi / Sashimi', es: 'Japonés / Sushi' },
    manuals: ['SUSHI'],
    deptIds: ['sushi']
  },
  { id: 'bbq', icon: '🍗', color: '#f59e0b',
    name: { ko: 'BB.Q CHICKEN', en: 'BB.Q CHICKEN', es: 'BB.Q POLLO' },
    desc: { ko: '한식 통닭',                       en: 'Korean Fried Chicken',       es: 'Pollo frito coreano' },
    manuals: ['BBQ'],
    deptIds: ['bbq']
  }
];

function getManualHubGroup(id) {
  return KMOCS_MANUAL_HUB.find(g => g.id === id);
}
function getManualFile(key, lang) {
  const m = KMOCS_MANUAL_FILES[key];
  if (!m) return null;
  return m[lang] || m.en || m.ko;
}

// ============================================================
//  ZONES 다국어 (KO/EN/ES) — Assign 화면 Zone 드롭다운
// ============================================================
const KMOCS_ZONES_I18N = {
  produce: {
    ko: ['야채 냉장 진열대', '과일 테이블', '백룸 농산 재고', '입고 정리 구역'],
    en: ['Vegetable Refrigerated Display', 'Fruit Table', 'Backroom Produce Stock', 'Receiving Sort Area'],
    es: ['Vitrina refrigerada de vegetales', 'Mesa de frutas', 'Almacén de frutas y verduras', 'Área de recepción']
  },
  meat: {
    ko: ['정육 진열대', '냉장 백룸', '작업대 / 칼날', '양념육 코너'],
    en: ['Meat Display', 'Refrigerated Backroom', 'Work Surface & Knives', 'Marinated Meat Corner'],
    es: ['Vitrina de carne', 'Almacén refrigerado', 'Mesa de trabajo y cuchillos', 'Sección de carne marinada']
  },
  seafood: {
    ko: ['생선 진열대', '수조', '냉장 백룸', '손질 작업대'],
    en: ['Fish Display', 'Live Tank', 'Refrigerated Backroom', 'Cleaning Station'],
    es: ['Vitrina de pescado', 'Tanque vivo', 'Almacén refrigerado', 'Estación de limpieza']
  },
  grocery: {
    ko: ['Aisle 1', 'Aisle 2', 'Aisle 3', 'Aisle 4', 'Aisle 5', '엔드캡', '세일존', '백룸 재고'],
    en: ['Aisle 1', 'Aisle 2', 'Aisle 3', 'Aisle 4', 'Aisle 5', 'End Cap', 'Sale Zone', 'Backroom Stock'],
    es: ['Pasillo 1', 'Pasillo 2', 'Pasillo 3', 'Pasillo 4', 'Pasillo 5', 'Cabecera', 'Zona de ofertas', 'Almacén']
  },
  frozen: {
    ko: ['Frozen Door 1–4', 'Frozen Door 5–8', 'Frozen Aisle', '아이스크림 코너'],
    en: ['Frozen Door 1–4', 'Frozen Door 5–8', 'Frozen Aisle', 'Ice Cream Corner'],
    es: ['Puerta congelada 1–4', 'Puerta congelada 5–8', 'Pasillo congelado', 'Sección de helados']
  },
  refrigerated: {
    ko: ['우유 / 음료 냉장', '햄 / 베이컨 냉장', '두부 / 반찬 냉장', '주류 냉장'],
    en: ['Milk / Beverages Cooler', 'Ham / Bacon Cooler', 'Tofu / Banchan Cooler', 'Liquor Cooler'],
    es: ['Refrigerador de leche / bebidas', 'Refrigerador de jamón / tocino', 'Refrigerador de tofu / banchan', 'Refrigerador de licores']
  },
  cashier: {
    ko: ['계산대 1', '계산대 2', '계산대 3', '셀프 체크아웃'],
    en: ['Register 1', 'Register 2', 'Register 3', 'Self-Checkout'],
    es: ['Caja 1', 'Caja 2', 'Caja 3', 'Auto-pago']
  },
  receiving: {
    ko: ['입고 도크', '냉장 입고 구역', '냉동 입고 구역', '인보이스 데스크'],
    en: ['Receiving Dock', 'Refrigerated Receiving', 'Frozen Receiving', 'Invoice Desk'],
    es: ['Muelle de recepción', 'Recepción refrigerada', 'Recepción congelada', 'Mesa de facturación']
  },
  stock: {
    ko: ['백룸 일반', '백룸 냉장', '백룸 냉동', '엔드캡 진열'],
    en: ['Backroom General', 'Backroom Cooler', 'Backroom Freezer', 'End Cap Display'],
    es: ['Almacén general', 'Almacén refrigerado', 'Almacén congelado', 'Cabecera de pasillo']
  },
  price: {
    ko: ['세일 가격표', 'POS 가격 동기화', 'ESL 업데이트', '신상품 등록'],
    en: ['Sale Price Tags', 'POS Price Sync', 'ESL Update', 'New Product Registration'],
    es: ['Etiquetas de oferta', 'Sincronización POS', 'Actualización ESL', 'Registro de nuevos productos']
  },
  sushi: {
    ko: ['스시 진열대', '롤 작업대', '냉장 백룸', '재료 준비대'],
    en: ['Sushi Display', 'Roll Station', 'Refrigerated Backroom', 'Prep Counter'],
    es: ['Vitrina de sushi', 'Estación de rollos', 'Almacén refrigerado', 'Mesa de preparación']
  },
  bbq: {
    ko: ['튀김 작업대', '진열 / 보온대', '재료 준비실', '포장 구역'],
    en: ['Frying Station', 'Display & Warmer', 'Prep Room', 'Packaging Area'],
    es: ['Estación de fritura', 'Vitrina y calentador', 'Sala de preparación', 'Área de empaque']
  },
  yumsem: {
    ko: ['김밥 작업대', '분식 조리대', '진열대', '재료 준비실'],
    en: ['Kimbap Station', 'Snack Cooking Station', 'Display', 'Prep Room'],
    es: ['Estación de kimbap', 'Estación de bocadillos', 'Vitrina', 'Sala de preparación']
  },
  umaga: {
    ko: ['반찬 제조실', '밀키트 제조실', '김치 제조실', '김밥 제조실', '양념고기 제조실', '냉장 보관실'],
    en: ['Banchan Kitchen', 'Meal Kit Kitchen', 'Kimchi Kitchen', 'Kimbap Kitchen', 'Marinated Meat Kitchen', 'Cold Storage'],
    es: ['Cocina de banchan', 'Cocina de kits', 'Cocina de kimchi', 'Cocina de kimbap', 'Cocina de carne marinada', 'Almacén frío']
  },
  bakery: {
    ko: ['반죽 작업대', '오븐 / 발효기', '진열대', '포장 작업대'],
    en: ['Dough Station', 'Oven & Proofer', 'Display', 'Packaging Station'],
    es: ['Estación de masa', 'Horno y fermentadora', 'Vitrina', 'Estación de empaque']
  }
};

function getZonesByLang(deptId, lang) {
  lang = lang || 'ko';
  const m = KMOCS_ZONES_I18N[deptId];
  if (!m) return KMOCS_ZONES[deptId] || [];
  return m[lang] || m.ko || KMOCS_ZONES[deptId] || [];
}
