# 선택 텍스트 우클릭 저장

> 작성일: 2026-01-27

## 목표
사이트에서 유용한 프롬프트를 발견했을 때, 텍스트를 선택하고 우클릭 메뉴에서 즉시 저장한다.

## 설계 요약
- Manifest 권한에 `contextMenus`를 추가한다.
- 서비스 워커에서 선택(selection) 컨텍스트 메뉴를 등록한다.
- 메뉴 클릭 시 `info.selectionText`를 `upsertPrompt`로 저장한다.
- 저장 직후 `lastSavedPromptId` 메타를 갱신해 팝업에서 최근 저장 항목을 강조한다.

## 저장 규칙 (MVP)
- `content`: 선택한 텍스트 전체
- `title`: 선택 텍스트의 첫 번째 비어있지 않은 줄
  - 40자를 넘으면 `...`로 자른다
  - 줄이 없으면 기본값 `"선택한 프롬프트"`

## 관련 파일
- `manifest.json`
- `src/background/service-worker.js`
- `src/shared/storage.js`
- `src/popup/popup.js`
