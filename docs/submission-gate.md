# Submission Gate Checklist

> **Source of Truth**: env var / model ID → `docs/reference/gemini-sdk-reference.md`
> 타입 / 파일 소유권 → `docs/contracts/shared-contract.md`
> 충돌 시 위 문서가 우선

## 자격 요건
- [ ] 대회 기간(2026-02-28 ~ 03-16) 내 신규 제작 증빙 (git log 첫 커밋 날짜)
- [ ] 팀원 전원 DevPost 등록 + 대회 참가 수락
- [ ] GCP 서비스 사용 증빙 (Gemini API 호출 로그)

## 필수 제출물
- [ ] 데모 영상 (4분 이내, 영어 또는 영어 자막)
- [ ] 공개 접근 가능 링크 (배포 URL)
- [ ] GitHub 리포지토리 (공개)
- [ ] 텍스트 설명 (DevPost)
- [ ] GCP 사용 증빙 스크린샷

## 기술 요건
- [ ] Gemini Live API 사용 (실시간 음성/영상)
- [ ] GenAI SDK 또는 ADK 사용
- [ ] GCP 서비스 1개 이상 활용

## 심사 기준 대응
- [ ] Impact (사용자 가치 데모)
- [ ] Remarkability (기술적 혁신 포인트)
- [ ] Usefulness (실용성)
- [ ] Creativity (창의성)
- [ ] Execution Quality (완성도, 에러 없는 데모)

## 데모 안전 모드 (Demo-Safe Fallback)

| 장애 시나리오 | Fallback | 비고 |
|-------------|----------|------|
| Live API 모델 만료 | gemini-2.0-flash-live-001 시도 | preview 모델 만료 대비 |
| Image Gen 실패 | 사전 생성된 샘플 이미지 | 3개 유물 사전 준비 |
| Places API 한도 | 하드코딩된 서울 박물관 데이터 | 데모용 |
| 네트워크 불안정 | 로컬 녹화 영상 백업 | 최후 수단 |

## 마감
- DevPost 제출: 2026-03-16 17:00 PT = 2026-03-17 09:00 KST
