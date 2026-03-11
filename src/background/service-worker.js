import { setLastSavedPromptMeta, upsertPrompt } from "../shared/storage.js";

const CONTEXT_MENU_ID = "prompt-pocket-save-selection";

function buildTitleFromSelection(text) {
  const firstLine = text.split("\n").map((line) => line.trim()).find(Boolean) || "";
  if (!firstLine) {
    return "선택한 프롬프트";
  }
  return firstLine.length > 40 ? `${firstLine.slice(0, 40)}...` : firstLine;
}

function createSelectionContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: "Prompt Pocket에 저장",
      contexts: ["selection"]
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("Prompt Pocket 설치/업데이트 완료");
  createSelectionContextMenu();
});

chrome.runtime.onStartup.addListener(() => {
  createSelectionContextMenu();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "PING") {
    sendResponse({ ok: true, source: "service-worker" });
    return;
  }

  if (message && message.type === "GET_VERSION") {
    sendResponse({ version: chrome.runtime.getManifest().version });
    return;
  }

  sendResponse({ ok: false, error: "UNKNOWN_MESSAGE" });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== CONTEXT_MENU_ID) {
    return;
  }

  const selectionText = (info.selectionText || "").trim();
  if (!selectionText) {
    console.warn("선택 텍스트가 비어 있어 저장하지 않음");
    return;
  }

  const title = buildTitleFromSelection(selectionText);
  const saved = await upsertPrompt({ title, content: selectionText });
  await setLastSavedPromptMeta(saved.id);
  console.log("선택 텍스트를 프롬프트로 저장 완료", saved.id);
});
