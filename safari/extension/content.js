// Passport — content script
// Optionally translates the page when a country (and auto-translate) is active.
// Injected into every page via manifest content_scripts.

const MAX_BATCH_CHARS = 8000;

let isTranslated = false;
let targetLanguage = null;

// ─── Init ─────────────────────────────────────────────────────────────────────

chrome.storage.local.get(["autoTranslate", "nativeLanguage", "activeCountry"], (prefs) => {
  if (!prefs.autoTranslate || !prefs.activeCountry || !prefs.nativeLanguage) return;
  targetLanguage = prefs.nativeLanguage;
  translatePage();
});

// Listen for country changes from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "COUNTRY_CHANGED") {
    chrome.storage.local.get(["autoTranslate", "nativeLanguage"], (prefs) => {
      if (prefs.autoTranslate && prefs.nativeLanguage && !isTranslated) {
        targetLanguage = prefs.nativeLanguage;
        translatePage();
      }
    });
  }
});

// ─── Translation ──────────────────────────────────────────────────────────────

async function translatePage() {
  if (isTranslated) return;

  const nodes = collectTextNodes(document.body);
  if (nodes.length === 0) return;

  // Batch by character count
  const batches = [];
  let batch = [];
  let batchChars = 0;
  for (const node of nodes) {
    const len = node.nodeValue.length;
    if (batchChars + len > MAX_BATCH_CHARS && batch.length > 0) {
      batches.push(batch);
      batch = [];
      batchChars = 0;
    }
    batch.push(node);
    batchChars += len;
  }
  if (batch.length > 0) batches.push(batch);

  for (const b of batches) {
    const texts = b.map((n) => n.nodeValue);
    const res = await chrome.runtime.sendMessage({ type: "TRANSLATE_BATCH", texts, targetLanguage });
    if (res?.ok && Array.isArray(res.translations)) {
      b.forEach((node, i) => {
        node.__passportOriginal = node.nodeValue;
        node.nodeValue = res.translations[i];
      });
    }
  }

  isTranslated = true;
}

function collectTextNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName?.toUpperCase();
      if (["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE"].includes(tag)) return NodeFilter.FILTER_REJECT;
      const text = node.nodeValue?.trim();
      if (!text || text.length < 2) return NodeFilter.FILTER_SKIP;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) nodes.push(node);
  return nodes;
}
