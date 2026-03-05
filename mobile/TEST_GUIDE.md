# TimeLens Mobile 테스트 가이드

> 팀원용 실행 및 테스트 매뉴얼

## 사전 준비

### 필수 환경
- **Node.js** 18 이상
- **iPhone 또는 Android 실기기** (시뮬레이터에서는 카메라/마이크 불가)
- **Expo Go 앱** 설치 ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- 테스트 기기와 개발 PC가 **같은 Wi-Fi 네트워크**에 연결

### 필수 키
- `GOOGLE_GENAI_API_KEY` — 프로젝트 루트의 `.env.local`에 설정되어 있어야 함

---

## 1단계: 프로젝트 클론 및 설치

```bash
# 레포 클론
git clone <repo-url>
cd wigtn-timelens

# 루트 의존성 설치 (Next.js 백엔드)
npm install

# 모바일 의존성 설치
cd mobile
npm install
cd ..
```

---

## 2단계: 환경 변수 확인

```bash
# .env.local 파일 확인
cat .env.local
```

아래 값이 설정되어 있는지 확인:
```
GOOGLE_GENAI_API_KEY=AIzaSy...  (Gemini API 키)
```

키가 없으면 [Google AI Studio](https://aistudio.google.com/apikey)에서 발급받으세요.

---

## 3단계: 로컬 IP 확인 및 설정

### Mac
```bash
ipconfig getifaddr en0
# 예: 192.168.123.155
```

### Windows
```bash
ipconfig
# Wi-Fi 어댑터의 IPv4 주소 확인
```

### 모바일 앱에 IP 반영

`mobile/constants/config.ts` 파일을 열어서 IP 수정:

```typescript
export const API_BASE_URL = __DEV__
  ? 'http://여기에_본인_IP:3000'  // ← 수정
  : 'https://timelens-api.run.app';
```

---

## 4단계: 백엔드 서버 실행

```bash
# 프로젝트 루트에서
npm run dev
```

서버 시작 후 토큰 발급 테스트:
```bash
curl -X POST http://localhost:3000/api/session \
  -H "Content-Type: application/json" \
  -d '{"language":"ko"}'
```

아래와 비슷한 응답이 나오면 성공:
```json
{
  "success": true,
  "data": {
    "sessionId": "...",
    "wsUrl": "auth_tokens/...",
    "expiresAt": ...
  }
}
```

---

## 5단계: Expo 개발 서버 실행

```bash
cd mobile
npx expo start
```

터미널에 QR 코드가 표시됩니다.

---

## 6단계: 실기기 연결

### iPhone
1. **Expo Go** 앱 열기
2. 카메라로 터미널의 QR 코드 스캔
3. 또는 Expo Go 앱 내 "Enter URL manually"에 `exp://본인IP:8081` 입력

### Android
1. **Expo Go** 앱 열기
2. "Scan QR code" 탭에서 QR 코드 스캔

---

## 7단계: 앱 테스트

### 테스트 순서

#### 1. 랜딩 화면
- [ ] TimeLens 로고와 "Start Exploring" 버튼이 보이는지 확인
- [ ] 4개 기능 설명 아이콘이 표시되는지 확인

#### 2. 권한 요청
- [ ] "Start Exploring" 탭 → 카메라 권한 팝업 → **허용**
- [ ] 마이크 권한 팝업 → **허용**
- [ ] 둘 다 허용하면 세션 화면으로 자동 이동

#### 3. 연결 단계 (ConnectionOverlay)
- [ ] 5단계 프로그레스가 순서대로 진행되는지 확인:
  - "Creating session..." (토큰 요청)
  - "Connecting to AI..." (WebSocket)
  - "Setting up microphone..." (오디오)
  - "Activating camera..." (카메라)
  - "Ready!" (완료)

#### 4. 카메라 화면
- [ ] 후면 카메라가 전체 화면에 표시되는지 확인
- [ ] 상단에 초록색 연결 표시 + "TimeLens Curator" 라벨

#### 5. AI 자동 인사 (핵심!)
- [ ] 연결 완료 후 **AI가 먼저 말을 거는지** 확인 (이어폰 권장)
- [ ] 이어폰 또는 스피커에서 AI 음성이 나오는지 확인
- [ ] 하단에 자막(LiveTranscript)이 표시되는지 확인

#### 6. 능동적 내레이션
- [ ] 카메라로 물건/그림/건물을 비추면 AI가 **자동으로 설명**하는지 확인
- [ ] 사용자가 아무 말 안 해도 AI가 먼저 반응하는지 확인

#### 7. AudioVisualizer
- [ ] 대기 상태: 미세한 "숨쉬기" 애니메이션
- [ ] AI 말할 때: 파형 바가 움직이는지 확인
- [ ] AI 말하는 중 탭하면 인터럽트(중단)되는지 확인

#### 8. KnowledgePanel
- [ ] AI가 유물 인식 시 → 하단에서 미니 패널이 자동 올라오는지 확인
- [ ] 유물 이름, 시대, 문명이 표시되는지 확인
- [ ] 위로 스와이프 → 패널 확대 (대화 내용 표시)
- [ ] 아래로 스와이프 → 패널 축소/닫기

#### 9. 마이크 토글
- [ ] 하단 마이크 버튼 탭 → 빨간색 (음소거)
- [ ] 다시 탭 → 흰색 (활성)

#### 10. 카메라 전환
- [ ] 카메라 전환 버튼 → 전면/후면 전환

---

## 문제 해결 (FAQ)

### "연결 중..." 에서 멈춤
- 백엔드 서버가 실행 중인지 확인
- `config.ts`의 IP 주소가 정확한지 확인
- 실기기와 PC가 같은 Wi-Fi인지 확인
- 방화벽에서 3000번 포트가 열려 있는지 확인

### AI 음성이 안 들림
- 기기 볼륨 확인 (무음 모드 해제)
- 이어폰 연결 상태 확인
- 백엔드 콘솔에 에러 로그가 있는지 확인

### 카메라가 안 보임
- 설정 → 앱 → Expo Go → 카메라 권한 허용 확인
- 앱 종료 후 재시작

### "Network error" 또는 fetch 실패
- 백엔드가 `http://본인IP:3000`에서 접근 가능한지 확인:
  ```bash
  # 실기기의 브라우저에서 직접 접속 테스트
  http://본인IP:3000/api/session
  ```
- Mac 방화벽 설정 확인 (시스템 설정 → 네트워크 → 방화벽)

### 번들 에러 (Red screen)
```bash
# Metro 캐시 클리어 후 재시작
cd mobile
npx expo start --clear
```

---

## 테스트 시나리오 (데모용)

### 시나리오 1: 박물관 유물
1. 박물관에서 유물 앞에 서기
2. 카메라로 유물 비추기
3. AI가 자동으로 인식하고 설명 시작
4. "이거 원래 모습은 어땠어?" → AI가 복원 이미지 생성
5. "다이어리 만들어줘" → 방문 기록 생성

### 시나리오 2: 실내 테스트 (유물 없이)
1. 구글에서 "로제타 스톤" 또는 "파르테논 신전" 사진 검색
2. 다른 기기 화면에 사진 띄우기
3. TimeLens 카메라로 해당 사진 비추기
4. AI가 인식하고 설명하는지 확인

### 시나리오 3: 대화 테스트
1. 연결 후 AI 인사 확인
2. "한국어로 말해줘" → 언어 전환 확인
3. AI 설명 중 "잠깐, 다른 질문 있어" → 인터럽트 확인
4. "근처 박물관 알려줘" → discover_nearby 함수 호출 확인

---

## 확인 체크리스트

| 항목 | 상태 |
|------|------|
| 백엔드 토큰 발급 | |
| Expo Go 연결 | |
| 카메라 표시 | |
| AI 자동 인사 | |
| 실시간 자막 | |
| 능동적 내레이션 | |
| 유물 인식 패널 | |
| 오디오 비주얼라이저 | |
| 마이크 토글 | |
| 카메라 전환 | |
