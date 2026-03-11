const DEFAULT_SETTINGS = {
  sortMode: "recent",
  filterTagId: null
};

const DEFAULT_DATA = {
  prompts: [],
  tags: [],
  settings: DEFAULT_SETTINGS,
  lastSavedPromptId: null,
  lastSavedAt: null
};

let memoryLocal = { ...DEFAULT_DATA };
let memorySync = {
  tags: [],
  settings: DEFAULT_SETTINGS
};

function hasChromeStorage() {
  return (
    typeof chrome !== "undefined" &&
    chrome.storage &&
    chrome.storage.local &&
    chrome.storage.sync
  );
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeSettings(value) {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_SETTINGS };
  }
  return {
    ...DEFAULT_SETTINGS,
    ...value,
    filterTagId: value.filterTagId ?? null
  };
}

function normalizeTag(tag) {
  const now = new Date().toISOString();
  return {
    id: tag.id,
    name: tag.name ?? "이름 없는 태그",
    color: tag.color ?? "#4A90D9",
    createdAt: tag.createdAt ?? now,
    updatedAt: now
  };
}

function normalizePrompt(prompt) {
  const now = new Date().toISOString();
  const createdAt = prompt.createdAt ?? now;
  return {
    id: prompt.id,
    title: prompt.title ?? "제목 없음",
    content: prompt.content ?? "",
    isFavorite: Boolean(prompt.isFavorite),
    tagIds: normalizeArray(prompt.tagIds),
    variables: normalizeArray(prompt.variables),
    usageCount: Number(prompt.usageCount ?? 0),
    lastUsedAt: prompt.lastUsedAt ?? null,
    createdAt,
    updatedAt: now
  };
}

function createId() {
  return `prompt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEntityId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getFromMemory(area, keys) {
  const source = area === "sync" ? memorySync : memoryLocal;
  if (!keys) {
    return { ...source };
  }
  if (Array.isArray(keys)) {
    return Object.fromEntries(keys.map((key) => [key, source[key]]));
  }
  if (typeof keys === "string") {
    return { [keys]: source[keys] };
  }
  const result = { ...keys };
  for (const key of Object.keys(keys)) {
    if (key in source) {
      result[key] = source[key];
    }
  }
  return result;
}

function setToMemory(area, values) {
  if (area === "sync") {
    memorySync = { ...memorySync, ...values };
    return;
  }
  memoryLocal = { ...memoryLocal, ...values };
}

async function storageGet(area, keys) {
  if (!hasChromeStorage()) {
    return getFromMemory(area, keys);
  }
  const storageArea = area === "sync" ? chrome.storage.sync : chrome.storage.local;
  return storageArea.get(keys);
}

async function storageSet(area, values) {
  if (!hasChromeStorage()) {
    setToMemory(area, values);
    return;
  }
  const storageArea = area === "sync" ? chrome.storage.sync : chrome.storage.local;
  await storageArea.set(values);
}

async function ensureSyncDefaults() {
  const sync = await storageGet("sync", ["tags", "settings"]);
  const nextValues = {};

  if (!Array.isArray(sync.tags)) {
    nextValues.tags = [];
  }

  const normalizedSettings = normalizeSettings(sync.settings);
  const shouldWriteSettings =
    !sync.settings ||
    Object.keys(normalizedSettings).some((key) => sync.settings?.[key] !== normalizedSettings[key]);
  if (shouldWriteSettings) {
    nextValues.settings = normalizedSettings;
  }

  if (Object.keys(nextValues).length > 0) {
    await storageSet("sync", nextValues);
  }

  return {
    tags: normalizeArray(nextValues.tags ?? sync.tags),
    settings: normalizeSettings(nextValues.settings ?? sync.settings)
  };
}

export async function getStorageSnapshot() {
  const local = await storageGet("local", ["prompts", "lastSavedPromptId", "lastSavedAt"]);
  const sync = await ensureSyncDefaults();

  return {
    prompts: normalizeArray(local.prompts),
    tags: normalizeArray(sync.tags),
    settings: normalizeSettings(sync.settings),
    lastSavedPromptId: local.lastSavedPromptId ?? null,
    lastSavedAt: local.lastSavedAt ?? null
  };
}

export async function listPrompts() {
  const { prompts } = await getStorageSnapshot();
  return prompts;
}

export async function listTags() {
  const { tags } = await getStorageSnapshot();
  return tags;
}

export async function getSettings() {
  const { settings } = await getStorageSnapshot();
  return settings;
}

export async function savePrompts(prompts) {
  await storageSet("local", { prompts: normalizeArray(prompts) });
}

export async function saveTags(tags) {
  await storageSet("sync", { tags: normalizeArray(tags) });
}

export async function saveSettings(settings) {
  await storageSet("sync", { settings: normalizeSettings(settings) });
}

export async function upsertPrompt(input) {
  const snapshot = await getStorageSnapshot();
  const prompts = [...snapshot.prompts];
  const id = input.id ?? createId();
  const index = prompts.findIndex((prompt) => prompt.id === id);
  const existing = index >= 0 ? prompts[index] : null;
  const hasUsageCount = Object.prototype.hasOwnProperty.call(input, "usageCount");
  const hasLastUsedAt = Object.prototype.hasOwnProperty.call(input, "lastUsedAt");

  const basePrompt = existing
    ? {
        ...existing,
        ...input,
        id,
        createdAt: existing.createdAt,
        usageCount: hasUsageCount ? input.usageCount : existing.usageCount,
        lastUsedAt: hasLastUsedAt ? input.lastUsedAt : existing.lastUsedAt
      }
    : { ...input, id };
  const nextPrompt = normalizePrompt(basePrompt);

  if (index >= 0) {
    prompts[index] = { ...prompts[index], ...nextPrompt };
  } else {
    prompts.unshift(nextPrompt);
  }

  await savePrompts(prompts);
  return nextPrompt;
}

export async function upsertTag(input) {
  const snapshot = await getStorageSnapshot();
  const tags = [...snapshot.tags];
  const id = input.id ?? createEntityId("tag");
  const nextTag = normalizeTag({ ...input, id });
  const index = tags.findIndex((tag) => tag.id === id);

  if (index >= 0) {
    tags[index] = { ...tags[index], ...nextTag };
  } else {
    tags.push(nextTag);
  }

  await saveTags(tags);
  return nextTag;
}

export async function deletePrompt(id) {
  const snapshot = await getStorageSnapshot();
  const prompts = snapshot.prompts.filter((prompt) => prompt.id !== id);
  await savePrompts(prompts);
  return { ok: true };
}

export async function deleteTag(id) {
  if (!id) {
    return { ok: false, error: "INVALID_TAG_ID" };
  }
  const snapshot = await getStorageSnapshot();
  const tags = snapshot.tags.filter((tag) => tag.id !== id);
  if (tags.length === snapshot.tags.length) {
    return { ok: false, error: "TAG_NOT_FOUND" };
  }
  const prompts = snapshot.prompts.map((prompt) => {
    const tagIds = (prompt.tagIds || []).filter((tagId) => tagId !== id);
    return tagIds.length === (prompt.tagIds || []).length ? prompt : { ...prompt, tagIds };
  });
  await saveTags(tags);
  await savePrompts(prompts);
  return { ok: true };
}

export async function markPromptUsed(id) {
  if (!id) {
    return null;
  }
  const snapshot = await getStorageSnapshot();
  const prompts = [...snapshot.prompts];
  const index = prompts.findIndex((prompt) => prompt.id === id);
  if (index < 0) {
    return null;
  }
  const target = prompts[index];
  const next = normalizePrompt({
    ...target,
    id: target.id,
    createdAt: target.createdAt,
    usageCount: Number(target.usageCount || 0) + 1,
    lastUsedAt: new Date().toISOString()
  });
  prompts[index] = { ...target, ...next };
  await savePrompts(prompts);
  return prompts[index];
}

export async function updateSettings(patch) {
  const current = await getSettings();
  const next = normalizeSettings({ ...current, ...(patch || {}) });
  await saveSettings(next);
  return next;
}

export async function setLastSavedPromptMeta(id) {
  const lastSavedAt = new Date().toISOString();
  await storageSet("local", { lastSavedPromptId: id ?? null, lastSavedAt });
  return { lastSavedPromptId: id ?? null, lastSavedAt };
}

export async function exportData() {
  const snapshot = await getStorageSnapshot();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    prompts: snapshot.prompts,
    tags: snapshot.tags
  };
}

export async function importData(data) {
  if (!data || !Array.isArray(data.prompts)) {
    throw new Error("INVALID_FORMAT");
  }
  const snapshot = await getStorageSnapshot();

  const existingTagIds = new Set(snapshot.tags.map((t) => t.id));
  const mergedTags = [...snapshot.tags];
  for (const tag of normalizeArray(data.tags)) {
    if (!existingTagIds.has(tag.id)) {
      mergedTags.push(tag);
    }
  }

  const existingPromptIds = new Set(snapshot.prompts.map((p) => p.id));
  const mergedPrompts = [...snapshot.prompts];
  for (const prompt of data.prompts) {
    if (!existingPromptIds.has(prompt.id)) {
      mergedPrompts.push(prompt);
    }
  }

  await saveTags(mergedTags);
  await savePrompts(mergedPrompts);

  return {
    addedPrompts: mergedPrompts.length - snapshot.prompts.length,
    addedTags: mergedTags.length - snapshot.tags.length
  };
}

export function __resetMemoryStorageForTests() {
  memoryLocal = { ...DEFAULT_DATA };
  memorySync = {
    tags: [],
    settings: DEFAULT_SETTINGS
  };
}
