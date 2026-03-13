// ============================================================
// i18n translations — ko / en
// ============================================================

export type Locale = 'ko' | 'en';

const translations = {
  // ── Landing Page ──────────────────────────────────────────
  'landing.tagline': {
    ko: 'AI 문화유산 컴패니언',
    en: 'AI Cultural Heritage Companion',
  },
  'landing.poweredBy': {
    ko: 'Powered by Gemini',
    en: 'Powered by Gemini',
  },
  'landing.feature1.title': {
    ko: '실시간 유물 인식',
    en: 'Real-time Artifact Recognition',
  },
  'landing.feature1.desc': {
    ko: '카메라를 비추면 AI가 유물을 인식하고 음성으로 설명합니다',
    en: 'Point your camera and AI recognizes artifacts with voice explanation',
  },
  'landing.feature2.title': {
    ko: 'AI 유물 복원',
    en: 'AI Artifact Restoration',
  },
  'landing.feature2.desc': {
    ko: '손상된 유물의 원래 모습을 AI가 복원합니다',
    en: 'AI restores the original appearance of damaged artifacts',
  },
  'landing.feature3.title': {
    ko: '주변 유산 발견',
    en: 'Nearby Heritage Discovery',
  },
  'landing.feature3.desc': {
    ko: '현재 위치 기반으로 주변 문화유산을 추천합니다',
    en: 'Discover cultural heritage sites near your location',
  },
  'landing.feature4.title': {
    ko: '방문 다이어리',
    en: 'Visit Diary',
  },
  'landing.feature4.desc': {
    ko: 'AI가 당신의 방문을 감성적인 다이어리로 기록합니다',
    en: 'AI creates an illustrated diary of your museum visit',
  },
  'landing.cta': {
    ko: '시작하기',
    en: 'Get Started',
  },
  'landing.ctaLoading': {
    ko: '시작 중...',
    en: 'Starting...',
  },
  'landing.permissionNote': {
    ko: '카메라와 마이크 권한이 필요합니다',
    en: 'Camera and microphone access required',
  },

  // ── Language Selector ─────────────────────────────────────
  'lang.title': {
    ko: '언어 선택',
    en: 'Select Language',
  },
  'lang.subtitle': {
    ko: 'AI 큐레이터가 선택한 언어로 안내합니다',
    en: 'Your AI curator will guide you in the selected language',
  },

  // ── Permission Gate ───────────────────────────────────────
  'permission.title': {
    ko: '권한 설정',
    en: 'Permission Setup',
  },
  'permission.subtitle': {
    ko: 'TimeLens는 유물을 인식하고 음성으로 대화하기 위해 카메라와 마이크 접근 권한이 필요합니다.',
    en: 'TimeLens needs camera and microphone access to recognize artifacts and have voice conversations.',
  },
  'permission.camera': {
    ko: '카메라',
    en: 'Camera',
  },
  'permission.microphone': {
    ko: '마이크',
    en: 'Microphone',
  },
  'permission.granted': {
    ko: '허용됨',
    en: 'Granted',
  },
  'permission.denied': {
    ko: '거부됨',
    en: 'Denied',
  },
  'permission.waiting': {
    ko: '대기 중',
    en: 'Waiting',
  },
  'permission.requesting': {
    ko: '요청 중',
    en: 'Requesting',
  },
  'permission.requestBtn': {
    ko: '권한 허용하기',
    en: 'Grant Permissions',
  },
  'permission.requestingBtn': {
    ko: '권한 요청 중...',
    en: 'Requesting...',
  },
  'permission.fallbackBtn': {
    ko: '권한 없이 계속하기',
    en: 'Continue without permissions',
  },
  'permission.fallbackNote': {
    ko: '브라우저 설정에서 카메라 권한을 허용하면 실시간 인식 기능을 사용할 수 있습니다.',
    en: 'Enable camera permission in browser settings for real-time recognition.',
  },
  'permission.retryBtn': {
    ko: '권한 다시 요청',
    en: 'Request Again',
  },
  'permission.browserNote': {
    ko: '계속 거부된다면 브라우저 주소창 잠금 아이콘에서 직접 허용해주세요',
    en: 'If still blocked, tap the lock icon in your browser address bar',
  },

  // ── Museum Selector ───────────────────────────────────────
  'museum.title': {
    ko: '오늘 어디를 탐험하시나요?',
    en: 'Where are you exploring today?',
  },
  'museum.searchPlaceholder': {
    ko: '박물관 검색...',
    en: 'Search museums...',
  },
  'museum.nearbyLabel': {
    ko: '현재 위치 기반',
    en: 'Near You',
  },
  'museum.nearbyEmpty': {
    ko: '근처 박물관을 찾을 수 없습니다. 검색을 이용해주세요.',
    en: 'No museums found nearby. Try searching instead.',
  },
  'museum.searchResults': {
    ko: '검색 결과',
    en: 'Search Results',
  },
  'museum.or': {
    ko: '또는',
    en: 'or',
  },
  'museum.skip': {
    ko: '박물관 없이 자유 탐험',
    en: 'Explore freely without a museum',
  },
  'museum.open': {
    ko: '영업 중',
    en: 'Open',
  },
  'museum.closed': {
    ko: '영업 종료',
    en: 'Closed',
  },
  'museum.locationLoading': {
    ko: '위치 확인 중...',
    en: 'Detecting location...',
  },
  'museum.locationDenied': {
    ko: '위치 정보 없이 탐색 중',
    en: 'Browsing without location',
  },
  'museum.locationDeniedNote': {
    ko: '위치를 허용하면 주변 장소를 바로 찾아드려요',
    en: 'Allow location to find nearby places',
  },
  'museum.confirmStart': {
    ko: '여기서 시작',
    en: 'Start Here',
  },
  'museum.confirmCancel': {
    ko: '취소',
    en: 'Cancel',
  },

  // ── Onboarding Splash ─────────────────────────────────────
  'splash.welcomeTo': {
    ko: '에 오신 것을 환영합니다',
    en: 'Welcome to ',
  },
  'splash.welcomeDefault': {
    ko: '탐험을 시작합니다',
    en: 'Starting your exploration',
  },
  'splash.subtitle': {
    ko: '당신만의 AI 큐레이터가 준비되었습니다',
    en: 'Your personal AI curator is ready',
  },
  'splash.connecting': {
    ko: '연결 중...',
    en: 'Connecting...',
  },
  'splash.slow': {
    ko: '연결에 시간이 걸리고 있습니다',
    en: 'Connection is taking longer than usual',
  },
  'splash.retry': {
    ko: '다시 시도',
    en: 'Retry',
  },

  // ── Session Page ──────────────────────────────────────────
  'session.inputPlaceholder': {
    ko: '메시지를 입력하세요...',
    en: 'Type a message...',
  },
  'session.send': {
    ko: '전송',
    en: 'Send',
  },
  'session.capture': {
    ko: '이거 봐봐',
    en: 'Look at this',
  },
  'session.restorationDone': {
    ko: '복원 완료',
    en: 'Restoration Complete',
  },
  'session.save': {
    ko: '저장',
    en: 'Save',
  },
  'session.saved': {
    ko: '복원 이미지 저장됨',
    en: 'Restoration image saved',
  },
  'session.cameraOpen': {
    ko: '카메라 열기',
    en: 'Open camera',
  },
  'session.cameraClose': {
    ko: '카메라 닫기',
    en: 'Close camera',
  },
  'session.micOn': {
    ko: '마이크 켜기',
    en: 'Unmute',
  },
  'session.micOff': {
    ko: '마이크 끄기',
    en: 'Mute',
  },
  'session.diary': {
    ko: '다이어리',
    en: 'Diary',
  },
  'session.diaryPrompt': {
    ko: '다이어리 만들어줘',
    en: 'Create a diary for me',
  },
  'session.exit': {
    ko: '종료',
    en: 'Exit',
  },
  'session.stop': {
    ko: '멈춰',
    en: 'Stop',
  },
  'session.exitConfirm': {
    ko: '세션을 종료하시겠습니까?',
    en: 'End this session?',
  },

  // ── Agent Indicator ───────────────────────────────────────
  'agent.curator': {
    ko: '큐레이터',
    en: 'Curator',
  },
  'agent.restoration': {
    ko: '복원',
    en: 'Restoration',
  },
  'agent.discovery': {
    ko: '탐험',
    en: 'Discovery',
  },
  'agent.diary': {
    ko: '다이어리',
    en: 'Diary',
  },
  'agent.switch.restoration': {
    ko: '시간여행을 시작합니다...',
    en: 'Starting time travel...',
  },
  'agent.switch.discovery': {
    ko: '주변 문화유산을 검색합니다',
    en: 'Searching nearby heritage sites',
  },
  'agent.switch.diary': {
    ko: '다이어리를 생성합니다',
    en: 'Creating your diary',
  },

  // ── Transcript Chat ───────────────────────────────────────
  'chat.empty': {
    ko: '대화가 곧 시작됩니다',
    en: 'Conversation will begin shortly',
  },
  'chat.sources': {
    ko: 'Google 검색 결과',
    en: 'via Google Search',
  },

  // ── Nearby Sites ──────────────────────────────────────────
  'nearby.loading': {
    ko: '주변 문화유산 검색 중...',
    en: 'Searching nearby heritage sites...',
  },
  'nearby.retry': {
    ko: '다시 시도',
    en: 'Retry',
  },
  'nearby.empty': {
    ko: '주변에 문화유산이 없습니다',
    en: 'No heritage sites nearby',
  },
  'nearby.title': {
    ko: '주변 문화유산',
    en: 'Nearby Heritage',
  },

  // ── Restoration Overlay ───────────────────────────────────
  'restoration.loading': {
    ko: '시간여행 중...',
    en: 'Time traveling...',
  },
  'restoration.failed': {
    ko: '복원 실패',
    en: 'Restoration failed',
  },
  'restoration.now': {
    ko: '현재',
    en: 'Now',
  },
  'restoration.restoringTo': {
    ko: '복원 중:',
    en: 'Restoring to',
  },
  'restoration.retry': {
    ko: '다시 시도',
    en: 'Try again',
  },
  'restoration.restored': {
    ko: '복원됨:',
    en: 'Restored:',
  },
  'restoration.share': {
    ko: '공유',
    en: 'Share',
  },

  // ── Camera ──────────────────────────────────────────────────
  'camera.unavailable': {
    ko: '카메라를 사용할 수 없습니다',
    en: 'Camera is not available',
  },

  // ── Audio ───────────────────────────────────────────────────
  'audio.generating': {
    ko: '생성 중',
    en: 'Generating',
  },

  // ── Error Boundary ──────────────────────────────────────────
  'error.title': {
    ko: '문제가 발생했습니다',
    en: 'Something went wrong',
  },
  'error.unknown': {
    ko: '알 수 없는 오류가 발생했습니다',
    en: 'An unknown error occurred',
  },
  'error.retry': {
    ko: '다시 시도',
    en: 'Try Again',
  },
  'error.refresh': {
    ko: '페이지 새로고침',
    en: 'Refresh Page',
  },

  // ── Nearby Card ─────────────────────────────────────────────
  'nearby.minutes': {
    ko: '분',
    en: 'min',
  },

  // ── Knowledge Panel ─────────────────────────────────────────
  'panel.expand': {
    ko: '패널 확장',
    en: 'Expand panel',
  },
  'panel.collapse': {
    ko: '패널 축소',
    en: 'Collapse panel',
  },
  'panel.closeFullscreen': {
    ko: '전체화면 닫기',
    en: 'Close fullscreen',
  },
  'panel.you': {
    ko: '나',
    en: 'You',
  },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, locale: Locale): string {
  return translations[key]?.[locale] ?? translations[key]?.en ?? key;
}

export default translations;
