# Prompt Pocket

자주 사용하는 프롬프트를 저장하고, AI 챗봇에 빠르게 복사해 사용하는 Chrome Extension 프로젝트입니다.

## 반드시 읽을 문서 (Must Read)
- `AGENTS.md`: 작업 규칙, 언어 지침, 저장소 운영 방식
- `docs/PRD.md`: 기능 범위, 우선순위, MVP 기준선
- `manifest.json`: 권한/경로/엔트리포인트 변경 전 확인 포인트
- `src/shared/storage.js`: 현재 스토리지 모델과 CRUD 기준 동작
- `src/background/service-worker.js`: 팝업 ↔ 콘텐츠 스크립트 메시지 라우팅 기준
- `/Users/hc/.codex/skills/readme-progress-log/SKILL.md`: README 기록/랩업 규칙(트리거: "리드미 해", "랩업 해")

## 현재 진행 상황 (2026-01-27)
MVP 핵심 흐름(저장 → 목록 → 복사)을 최소 기능으로 연결했습니다.
- 스토리지 모델 및 CRUD 유틸 추가: `src/shared/storage.js`
- 스토리지 테스트 추가: `tests/storage.test.js`
- 팝업에 프롬프트 추가/목록/삭제 UI 연결: `src/popup/index.html`, `src/popup/popup.js`, `src/popup/popup.css`
- 선택 텍스트 우클릭 저장 추가: `manifest.json`, `src/background/service-worker.js`
- 최근 저장 강조/토스트: `src/shared/storage.js`, `src/popup/popup.js`, `src/popup/popup.css`
- sync 기본 스키마/유틸 확장: `src/shared/storage.js`, `tests/storage.test.js`
- 태그 최소 UI(쉼표 입력/연결/표시): `src/popup/index.html`, `src/popup/popup.js`, `src/popup/popup.css`
- 프롬프트 수정(Edit) 최소 흐름: `src/popup/popup.js`
- 검색/정렬(MVP): `src/popup/index.html`, `src/popup/popup.js`, `src/popup/popup.css`
- 태그 최소 UI(쉼표 입력/연결/표시): `src/popup/index.html`, `src/popup/popup.js`, `src/popup/popup.css`
- 사용 기록 반영: 복사 시 usageCount/lastUsedAt 갱신 (`src/shared/storage.js`, `src/popup/popup.js`, `tests/storage.test.js`)
- 목록 상태 저장/필터/UX 보강: 정렬/태그 필터 상태 저장, 필터 UI, 버튼 비활성/실패 토스트 (`src/popup/index.html`, `src/popup/popup.js`, `src/popup/popup.css`)
- 태그 필터: 전체 태그 토글 선택 (`src/popup/index.html`, `src/popup/popup.js`, `src/popup/popup.css`)
- 테스트 스크립트 확장 및 통과: `package.json`, `npm run test`

## 로컬에서 확인하기
1. Chrome에서 `chrome://extensions` 접속
2. "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드" 클릭
4. 이 저장소 루트 폴더 선택
5. 팝업에서 "복사" 버튼으로 클립보드 복사 동작 테스트

## 테스트 실행
현재는 Node 내장 `assert` 기반의 최소 테스트만 구성되어 있습니다.

```bash
npm run test
```

수동 테스트 시나리오는 `docs/plans/2026-01-27-manual-test-scenarios.md`에 정리되어 있습니다.

## 다음 단계 해야 할 일 (체크리스트)
- [x] 복사 실패 UX 개선: 실패 사유를 팝업에 구체적으로 표시
- [x] 선택 텍스트 저장: 우클릭 메뉴에서 선택 텍스트를 프롬프트로 저장
- [x] 최근 저장 강조: 우클릭 저장 직후 팝업에서 최근 저장 항목을 강조/토스트 표시
- [x] 스토리지 스키마 확장: tags/settings 기본 데이터와 유틸 추가(편집 UI는 추후)
- [x] 수동 테스트 시나리오 문서화: 복사 성공/실패 케이스 체크리스트 작성
- [x] 태그 필터: 전체 태그 토글 선택
- [ ] Ralph loop 도입 여부 결정: 루트에 `progress.txt`를 추가할지 결정

## 랩업 (Wrap-up)
- 이번 세션 요약: 스토리지 모델을 만든 뒤 팝업 목록과 복사 흐름까지 MVP 핵심 경로를 연결했습니다.
- 레슨:
  - 스토리지 유틸을 먼저 고정하고 UI를 붙이는 순서가 변경 비용을 줄입니다.
  - 메시지 라우팅은 서비스 워커에서 “활성 탭으로 중계” 패턴으로 단순화하는 것이 안정적입니다.
- 다음 액션:
  - [ ] 저장/복사 흐름의 실패 사유를 팝업에서 분기 처리

## 작업 기록
- 2026-01-27: 초기 스캐폴딩, 팝업 테스트 화면, 최소 테스트 추가
- 2026-01-27: README에 현재 진행 상황 및 다음 단계 체크리스트 정리
- 2026-01-27: README에 Must Read 및 랩업 섹션 추가
- 2026-01-27: README 운영 스킬(`readme-progress-log`) 및 Ralph loop 스킬 설치/정리
- 2026-01-27: 스토리지 모델/테스트 추가 및 팝업 목록 UI 연결
- 2026-01-27: 팝업 목록과 복사 흐름 연결
- 2026-01-27: 변수 치환 기능 제거 및 테스트 정리
