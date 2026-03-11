import assert from "node:assert/strict";
import {
  __resetMemoryStorageForTests,
  deletePrompt,
  deleteTag,
  getSettings,
  listPrompts,
  listTags,
  markPromptUsed,
  upsertPrompt,
  upsertTag,
  updateSettings
} from "../src/shared/storage.js";

async function run() {
  __resetMemoryStorageForTests();

  const created = await upsertPrompt({
    title: "번역 요청",
    content: "{{언어}}로 번역: {{텍스트}}"
  });

  assert.ok(created.id, "id가 생성되어야 합니다");

  const listAfterCreate = await listPrompts();
  assert.equal(listAfterCreate.length, 1);
  assert.equal(listAfterCreate[0].title, "번역 요청");

  const usedOnce = await markPromptUsed(created.id);
  assert.equal(usedOnce.usageCount, 1);
  assert.ok(usedOnce.lastUsedAt, "lastUsedAt이 기록되어야 합니다");

  const updated = await upsertPrompt({
    id: created.id,
    title: "번역 요청(수정)",
    content: created.content,
    usageCount: 3,
    isFavorite: true
  });

  assert.equal(updated.id, created.id);

  const listAfterUpdate = await listPrompts();
  assert.equal(listAfterUpdate.length, 1);
  assert.equal(listAfterUpdate[0].title, "번역 요청(수정)");
  assert.equal(listAfterUpdate[0].usageCount, 3);
  assert.equal(listAfterUpdate[0].lastUsedAt, usedOnce.lastUsedAt);
  assert.equal(listAfterUpdate[0].isFavorite, true);

  await deletePrompt(created.id);
  const listAfterDelete = await listPrompts();
  assert.equal(listAfterDelete.length, 0);

  const newTag = await upsertTag({ name: "번역", color: "#ff9900" });
  const tagsAfterUpsert = await listTags();
  assert.ok(tagsAfterUpsert.some((tag) => tag.id === newTag.id));

  const promptWithMeta = await upsertPrompt({
    title: "태그 테스트",
    content: "내용",
    tagIds: [newTag.id]
  });

  const deleteTagResult = await deleteTag(newTag.id);
  assert.equal(deleteTagResult.ok, true);
  const afterTagDelete = await listPrompts();
  const tagRemoved = afterTagDelete.find((prompt) => prompt.id === promptWithMeta.id);
  assert.equal(tagRemoved.tagIds.length, 0);

  const beforeSettings = await getSettings();
  assert.equal(beforeSettings.sortMode, "recent");
  assert.equal(beforeSettings.filterTagId, null);
  const updatedSettings = await updateSettings({ sortMode: "usage" });
  assert.equal(updatedSettings.sortMode, "usage");
  const afterSettings = await getSettings();
  assert.equal(afterSettings.sortMode, "usage");

  console.log("storage.test.js: 모든 테스트 통과");
}

run();
