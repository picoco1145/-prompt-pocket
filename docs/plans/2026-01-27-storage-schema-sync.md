# Sync 스토리지 스키마 확장 (MVP)

> 작성일: 2026-01-27

## 목표
- `tags/settings`가 비어 있어도 안전하게 동작하도록 기본값을 보장한다.
- UI가 아직 없더라도 데이터 계층에서 CRUD를 시작할 수 있게 유틸을 제공한다.

## 변경 요약
- `getStorageSnapshot()` 호출 시 sync 기본값을 보장하는 초기화 로직 추가
- 아래 유틸 추가
  - `listTags`, `getSettings`
  - `upsertTag`
  - `updateSettings`

## 관련 파일
- `src/shared/storage.js`
- `tests/storage.test.js`
