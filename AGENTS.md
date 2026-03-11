# Repository Guidelines

## 언어 지침
- 모든 응답과 문서는 한국어로 작성합니다.
- 코드, 명령어, 파일 경로는 필요 시 원문(영문) 표기를 유지합니다.

## 프로젝트 구조 및 모듈 구성
이 저장소는 **Prompt Pocket** 크롬 확장 프로그램의 초기 스캐폴딩과 제품 문서로 구성되어 있습니다. 핵심 경로:
- `manifest.json`: Manifest V3 진입점
- `src/popup/`: 팝업 UI (`index.html`, `popup.js`, `popup.css`)
- `src/background/`: 서비스 워커 (`service-worker.js`)
- `src/shared/`: 공유 유틸 (`templating.js`)
- `tests/`: 기능 단위 테스트 (예: `tests/templating/templating.test.js`)
- `docs/`: 요구사항 및 설계 문서 (`docs/PRD.md`, `docs/plans/`)

새 기능은 `src/`에 추가하고, 관련 결정은 `docs/`에 짧게 남깁니다.

## 빌드, 테스트, 개발 명령어
현재는 “로드 가능한 확장 + 최소 테스트”에 초점을 둡니다.
- `npm run test`: 템플릿 유틸 테스트 실행 (Node 내장 `assert` 사용)
- `npm run dev|build|lint`: 아직 자리표시자 스크립트입니다.

확장 로컬 실행 방법:
1. 크롬에서 `chrome://extensions` 접속
2. "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드" → 이 저장소 루트 선택

## 코딩 스타일 및 네이밍 규칙
포매터 도입 전 기본 규칙:
- 들여쓰기: JS/TS, JSON, Markdown 모두 2칸
- 파일명: `kebab-case` (예: `prompt-list.ts`)
- 컴포넌트: `PascalCase`, 변수/함수: `camelCase`
- 모듈은 작고 단일 책임을 유지하고, 축약어보다 명확한 이름을 우선합니다.

도구를 추가한다면 다음을 권장합니다:
- 포맷팅: Prettier
- 린팅: ESLint(+ TypeScript)

## 테스트 가이드라인
저장소/파싱/프롬프트 템플릿(변수 치환) 관련 동작에는 테스트를 추가합니다.
- 테스트 위치: `tests/` 아래에서 `src/` 구조를 반영
- 테스트 파일명: `*.test.js|ts` 또는 `*.spec.js|ts`
- 크롬 API는 경계에서 목/스텁으로 대체하고, 결정적(unit) 테스트를 우선합니다.

## 커밋 및 PR 가이드라인
현재 이 디렉터리는 Git 저장소가 아니므로, 히스토리 기반 규칙 대신 일관된 규칙을 사용합니다.
- 커밋 메시지: 명령형 요약 1줄 (예: `변수 치환 유틸 추가`)
- PR에는 목적, 범위, 주요 결정, 수동 테스트 절차를 포함하세요.
- 동작이 바뀌면 관련 문서(예: `docs/PRD.md`)를 함께 갱신하세요.

## 보안 및 설정 팁
Manifest V3와 크롬 확장 권한은 인터페이스의 일부로 취급합니다.
- 권한은 최소 범위로 요청합니다 (`storage`, `contextMenus`, `clipboardWrite`).
- 새로운 host 권한을 추가할 경우, 필요한 이유와 영향을 문서화하세요.
