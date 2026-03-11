import {
  deletePrompt,
  getStorageSnapshot,
  markPromptUsed,
  updateSettings,
  upsertPrompt,
  upsertTag
} from "../shared/storage.js";

const toast = document.querySelector("#toast");

const promptTitleInput = document.querySelector("#prompt-title");
const promptContentInput = document.querySelector("#prompt-content");
const promptTagsInput = document.querySelector("#prompt-tags");
const addPromptButton = document.querySelector("#add-prompt");
const refreshPromptsButton = document.querySelector("#refresh-prompts");
const promptSearchInput = document.querySelector("#prompt-search");
const promptSortSelect = document.querySelector("#prompt-sort");
const tagFilterList = document.querySelector("#tag-filter-list");
const promptList = document.querySelector("#prompt-list");

let lastSavedPromptId = null;
let toastTimerId = null;
let pendingToastForRecentSave = false;
let editingPromptId = null;
let currentSearchTerm = "";
let currentSortMode = "recent";
let currentTagNameById = {};
let currentTagFilterId = "";
let settingsInitialized = false;

async function copyPromptToClipboard(text) {
  if (!text) {
    return { ok: false, error: "EMPTY_TEXT" };
  }

  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return { ok: true };
    } catch (error) {
      console.warn("클립보드 복사 실패, 대체 방식 시도", error);
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const succeeded = document.execCommand("copy");
    textarea.remove();
    return succeeded ? { ok: true } : { ok: false, error: "COPY_FAILED" };
  } catch (error) {
    console.warn("클립보드 복사 실패", error);
    return { ok: false, error: "COPY_FAILED" };
  }
}

const copyErrorMessages = {
  EMPTY_TEXT: "복사할 텍스트가 없습니다.",
  COPY_FAILED: "클립보드 복사에 실패했습니다. 다시 시도해 주세요.",
  UNKNOWN_ERROR: "알 수 없는 이유로 복사에 실패했습니다."
};

function resolveCopyErrorMessage(result) {
  const code = result?.error || result?.reason || "UNKNOWN_ERROR";
  return copyErrorMessages[code] || copyErrorMessages.UNKNOWN_ERROR;
}

function showToast(message) {
  if (!toast) {
    return;
  }
  toast.textContent = message;
  toast.hidden = false;
  if (toastTimerId) {
    clearTimeout(toastTimerId);
  }
  toastTimerId = window.setTimeout(() => {
    toast.hidden = true;
  }, 2200);
}

function persistSettings(patch) {
  updateSettings(patch).catch((error) => {
    console.warn("settings 저장 실패", error);
  });
}

function renderTagFilterOptions(tags) {
  if (!tagFilterList) {
    return;
  }
  tagFilterList.innerHTML = "";
  const sorted = [...tags].sort((a, b) => (a.name || "").localeCompare(b.name || "", "ko"));
  if (currentTagFilterId && !sorted.some((tag) => tag.id === currentTagFilterId)) {
    currentTagFilterId = "";
    persistSettings({ filterTagId: null });
  }
  if (!sorted.length) {
    const empty = document.createElement("div");
    empty.className = "tag-filter__empty";
    empty.textContent = "등록된 태그가 없습니다.";
    tagFilterList.append(empty);
    return;
  }
  for (const tag of sorted) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tag-filter__item";
    button.textContent = tag.name || "이름 없는 태그";
    if (currentTagFilterId === tag.id) {
      button.classList.add("tag-filter__item--active");
    }
    button.addEventListener("click", () => {
      const nextId = currentTagFilterId === tag.id ? "" : tag.id;
      currentTagFilterId = nextId;
      persistSettings({ filterTagId: nextId || null });
      refreshPrompts();
    });
    tagFilterList.append(button);
  }
}

function setEditingPrompt(prompt) {
  editingPromptId = prompt.id;
  promptTitleInput.value = prompt.title || "";
  promptContentInput.value = prompt.content || "";
  if (promptTagsInput) {
    const tagNames = (prompt.tagIds || []).map((id) => currentTagNameById[id]).filter(Boolean);
    promptTagsInput.value = tagNames.join(",");
  }
  addPromptButton.textContent = "수정 저장";
  showToast("수정 모드: 내용을 바꾼 뒤 저장하세요.");
}

function resetEditingState() {
  editingPromptId = null;
  addPromptButton.textContent = "저장";
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}


function renderPromptList(prompts, recentPromptId, tags) {
  promptList.innerHTML = "";

  const filtered = filterPrompts(prompts, currentSearchTerm, currentTagFilterId);
  const sorted = sortPrompts(filtered, currentSortMode);

  if (!sorted.length) {
    const empty = document.createElement("li");
    empty.className = "list__empty";
    empty.textContent = currentSearchTerm
      ? "검색 결과가 없습니다."
      : "아직 저장된 프롬프트가 없습니다.";
    promptList.append(empty);
    return;
  }

  const tagNameById = Object.fromEntries((tags || []).map((tag) => [tag.id, tag.name]));

  for (const prompt of sorted) {
    const item = document.createElement("li");
    item.className = "prompt-item";
    if (recentPromptId && prompt.id === recentPromptId) {
      item.classList.add("prompt-item--recent");
    }

    const header = document.createElement("div");
    header.className = "prompt-item__header";

    const title = document.createElement("h3");
    title.className = "prompt-item__title";
    title.textContent = prompt.title || "제목 없음";

    const actions = document.createElement("div");
    actions.className = "prompt-item__actions";

    const favoriteButton = document.createElement("button");
    favoriteButton.className = "prompt-item__button prompt-item__favorite";
    favoriteButton.type = "button";
    favoriteButton.textContent = prompt.isFavorite ? "★" : "☆";
    favoriteButton.setAttribute(
      "aria-label",
      prompt.isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"
    );
    favoriteButton.addEventListener("click", async () => {
      favoriteButton.disabled = true;
      try {
        await upsertPrompt({
          id: prompt.id,
          title: prompt.title,
          content: prompt.content,
          tagIds: prompt.tagIds || [],
          isFavorite: !prompt.isFavorite
        });
        await refreshPrompts();
      } finally {
        favoriteButton.disabled = false;
      }
    });

    const copyButton = document.createElement("button");
    copyButton.className = "prompt-item__button";
    copyButton.textContent = "📋";
    copyButton.setAttribute("aria-label", "복사");
    copyButton.title = "복사";
    copyButton.addEventListener("click", async () => {
      copyButton.disabled = true;
      const rendered = prompt.content || "";
      try {
        const result = await copyPromptToClipboard(rendered);
        if (!result?.ok) {
          const message = resolveCopyErrorMessage(result);
          showToast(`복사 실패: ${message}`);
          return;
        }
        await markPromptUsed(prompt.id);
        showToast("클립보드에 복사했습니다.");
        await refreshPrompts();
      } finally {
        copyButton.disabled = false;
      }
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "prompt-item__button";
    deleteButton.textContent = "🗑️";
    deleteButton.setAttribute("aria-label", "삭제");
    deleteButton.title = "삭제";
    deleteButton.addEventListener("click", async () => {
      await deletePrompt(prompt.id);
      if (prompt.id === editingPromptId) {
        promptTitleInput.value = "";
        promptContentInput.value = "";
        resetEditingState();
      }
      await refreshPrompts();
    });

    const editButton = document.createElement("button");
    editButton.className = "prompt-item__button";
    editButton.textContent = "✏️";
    editButton.setAttribute("aria-label", "수정");
    editButton.title = "수정";
    editButton.addEventListener("click", () => {
      setEditingPrompt(prompt);
    });

    actions.append(favoriteButton, copyButton, editButton, deleteButton);
    header.append(title, actions);

    const details = document.createElement("div");
    details.className = "prompt-item__details";

    const content = document.createElement("p");
    content.className = "prompt-item__content";
    content.textContent = prompt.content || "";

    const stats = document.createElement("div");
    stats.className = "prompt-item__stats";
    const usageCount = Number(prompt.usageCount || 0);
    const lastUsedAt = formatDateTime(prompt.lastUsedAt);
    stats.textContent = `사용: ${usageCount}회 · 최근 사용: ${lastUsedAt}`;

    const tagsLine = document.createElement("div");
    tagsLine.className = "prompt-item__tags";
    const tagNames = (prompt.tagIds || []).map((id) => tagNameById[id]).filter(Boolean);
    tagsLine.textContent = tagNames.length ? `태그: ${tagNames.join(", ")}` : "태그: 없음";

    details.append(stats, tagsLine, content);
    item.append(header, details);
    item.addEventListener("click", (event) => {
      if (event.target.closest("button")) {
        return;
      }
      item.classList.toggle("prompt-item--expanded");
    });
    promptList.append(item);
  }
}

function filterPrompts(prompts, term, tagFilterId) {
  const needle = (term || "").trim().toLowerCase();
  return prompts.filter((prompt) => {
    if (tagFilterId && !(prompt.tagIds || []).includes(tagFilterId)) {
      return false;
    }
    if (!needle) {
      return true;
    }
    const haystack = `${prompt.title || ""}\n${prompt.content || ""}`.toLowerCase();
    return haystack.includes(needle);
  });
}

function sortPrompts(prompts, mode) {
  const next = [...prompts];
  const compareByMode = (a, b) => {
    if (mode === "title") {
      return (a.title || "").localeCompare(b.title || "", "ko");
    }
    if (mode === "usage") {
      return Number(b.usageCount || 0) - Number(a.usageCount || 0);
    }
    const aTime = Date.parse(a.updatedAt || a.createdAt || 0) || 0;
    const bTime = Date.parse(b.updatedAt || b.createdAt || 0) || 0;
    return bTime - aTime;
  };
  next.sort((a, b) => {
    const favoriteDelta = Number(Boolean(b.isFavorite)) - Number(Boolean(a.isFavorite));
    if (favoriteDelta !== 0) {
      return favoriteDelta;
    }
    return compareByMode(a, b);
  });
  return next;
}

function handleSearchInput(event) {
  currentSearchTerm = event.target.value || "";
  refreshPrompts();
}

function handleSortChange(event) {
  currentSortMode = event.target.value || "recent";
  persistSettings({ sortMode: currentSortMode });
  refreshPrompts();
}

async function refreshPrompts() {
  const snapshot = await getStorageSnapshot();
  currentTagNameById = Object.fromEntries(snapshot.tags.map((tag) => [tag.id, tag.name]));

  if (!settingsInitialized) {
    currentSortMode = snapshot.settings.sortMode || "recent";
    currentTagFilterId = snapshot.settings.filterTagId || "";
    settingsInitialized = true;
  }

  renderTagFilterOptions(snapshot.tags);

  if (promptSortSelect && promptSortSelect.value !== currentSortMode) {
    promptSortSelect.value = currentSortMode;
  }
  const recentPromptId = snapshot.lastSavedPromptId;
  if (pendingToastForRecentSave && recentPromptId && recentPromptId !== lastSavedPromptId) {
    showToast("방금 선택한 텍스트를 저장했어요.");
  }
  pendingToastForRecentSave = false;
  lastSavedPromptId = recentPromptId ?? null;
  renderPromptList(snapshot.prompts, recentPromptId, snapshot.tags);
}

async function handleAddPrompt() {
  const title = promptTitleInput.value.trim();
  const content = promptContentInput.value.trim();

  if (!title || !content) {
    return;
  }

  addPromptButton.disabled = true;
  try {
    const tagIds = await ensureTagIdsFromInput();
    const saved = await upsertPrompt({
      id: editingPromptId ?? undefined,
      title,
      content,
      tagIds
    });
    promptTitleInput.value = "";
    promptContentInput.value = "";
    if (promptTagsInput) {
      promptTagsInput.value = "";
    }
    if (editingPromptId) {
      showToast(`프롬프트 수정 완료: ${saved.title}`);
    } else {
      showToast(`프롬프트 저장 완료: ${saved.title}`);
    }
    resetEditingState();
    await refreshPrompts();
  } finally {
    addPromptButton.disabled = false;
  }
}

function parseTagNames(text) {
  return (text || "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}

async function ensureTagIdsFromInput() {
  const names = parseTagNames(promptTagsInput?.value || "");
  if (!names.length) {
    return [];
  }
  const snapshot = await getStorageSnapshot();
  const existingByName = new Map(snapshot.tags.map((tag) => [tag.name, tag]));
  const ids = [];
  for (const name of names) {
    const existing = existingByName.get(name);
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const created = await upsertTag({ name });
    existingByName.set(created.name, created);
    ids.push(created.id);
  }
  return ids;
}

addPromptButton.addEventListener("click", handleAddPrompt);
refreshPromptsButton.addEventListener("click", refreshPrompts);
promptSearchInput?.addEventListener("input", handleSearchInput);
promptSortSelect?.addEventListener("change", handleSortChange);

if (chrome?.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }
    if (changes.lastSavedPromptId) {
      pendingToastForRecentSave = true;
      refreshPrompts();
    }
  });
}

refreshPrompts();
