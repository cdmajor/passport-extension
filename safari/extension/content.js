// Passport — content script v1.2.0
// Translates page text including shadow DOM, same-origin iframes, and dynamic content.

const MAX_BATCH_CHARS = 6000; // slightly smaller to stay under server rate limit
const BATCH_DELAY_MS  = 350;  // pause between batches to avoid rate-limiting

let isTranslated   = false;
let targetLanguage = null;
let mutObserver    = null;

// ─── Init ─────────────────────────────────────────────────────────────────────

chrome.storage.local.get(["autoTranslate", "nativeLanguage", "activeCountry"], (prefs) => {
  if (!prefs.autoTranslate || !prefs.activeCountry || !prefs.nativeLanguage) return;
  targetLanguage = prefs.nativeLanguage;
  translatePage();
});

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

// ─── Page-level entry point ───────────────────────────────────────────────────

async function translatePage() {
  if (isTranslated) return;
  isTranslated = true; // guard against concurrent calls

  // Main document
  await translateRoot(document.body);

  // Same-origin iframes — cross-origin ones throw and are silently skipped
  for (const iframe of document.querySelectorAll("iframe")) {
    try {
      const doc = iframe.contentDocument;
      if (doc && doc.body) await translateRoot(doc.body);
    } catch { /* cross-origin — browser blocks access */ }
  }

  // Watch for dynamically injected content after the initial pass
  startMutationObserver();
}

// ─── Translate a subtree ──────────────────────────────────────────────────────

async function translateRoot(root) {
  const nodes = collectTextNodes(root);
  if (nodes.length === 0) return;

  for (const batch of buildBatches(nodes)) {
    const texts = batch.map((n) => n.nodeValue);
    try {
      const res = await chrome.runtime.sendMessage({
        type: "TRANSLATE_BATCH",
        texts,
        targetLanguage,
      });
      if (res?.ok && Array.isArray(res.translations)) {
        batch.forEach((node, i) => {
          node.__passportOriginal = node.nodeValue;
          node.nodeValue = res.translations[i];
        });
      }
    } catch { /* background not ready — skip batch */ }
    await sleep(BATCH_DELAY_MS);
  }
}

function buildBatches(nodes) {
  const batches = [];
  let batch = [], chars = 0;
  for (const node of nodes) {
    const len = node.nodeValue.length;
    if (chars + len > MAX_BATCH_CHARS && batch.length > 0) {
      batches.push(batch);
      batch = [];
      chars = 0;
    }
    batch.push(node);
    chars += len;
  }
  if (batch.length > 0) batches.push(batch);
  return batches;
}

// ─── Text node collector (shadow DOM aware) ───────────────────────────────────

function collectTextNodes(root) {
  const nodes = [];
  walkSubtree(root, nodes);
  return nodes;
}

function walkSubtree(root, out) {
  // Walk the regular DOM tree
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!isTranslatableNode(node)) return NodeFilter.FILTER_SKIP;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node;
  while ((node = walker.nextNode())) out.push(node);

  // Recurse into any shadow roots attached to elements inside this subtree
  // (querySelectorAll doesn't pierce shadow DOM, so we walk elements manually)
  const elements = root.querySelectorAll ? root.querySelectorAll("*") : [];
  for (const el of elements) {
    if (el.shadowRoot) walkSubtree(el.shadowRoot, out);
  }
}

function isTranslatableNode(node) {
  const parent = node.parentElement;
  if (!parent) return false;
  const tag = parent.tagName?.toUpperCase();
  if (["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE"].includes(tag)) return false;
  const text = node.nodeValue?.trim();
  if (!text || text.length < 2) return false;
  if (node.__passportOriginal !== undefined) return false; // already translated
  return true;
}

// ─── MutationObserver — catch dynamically added text ─────────────────────────

let pendingMutationNodes = [];
let mutationFlushTimer   = null;

function startMutationObserver() {
  if (mutObserver) return;

  mutObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const added of m.addedNodes) {
        if (added.nodeType === Node.TEXT_NODE) {
          if (isTranslatableNode(added)) pendingMutationNodes.push(added);
        } else if (added.nodeType === Node.ELEMENT_NODE) {
          // Collect all translatable text nodes inside the new subtree
          pendingMutationNodes.push(...collectTextNodes(added));
        }
      }
    }
    if (pendingMutationNodes.length > 0) scheduleMutationFlush();
  });

  mutObserver.observe(document.body, { childList: true, subtree: true });
}

function scheduleMutationFlush() {
  if (mutationFlushTimer) return;
  // Debounce: wait 600 ms for DOM changes to settle before translating
  mutationFlushTimer = setTimeout(async () => {
    mutationFlushTimer = null;
    const batch = pendingMutationNodes.splice(0);
    if (batch.length === 0) return;

    // Translate in sub-batches with rate-limit delay
    for (const subBatch of buildBatches(batch)) {
      const texts = subBatch.map((n) => n.nodeValue);
      try {
        const res = await chrome.runtime.sendMessage({
          type: "TRANSLATE_BATCH",
          texts,
          targetLanguage,
        });
        if (res?.ok && Array.isArray(res.translations)) {
          subBatch.forEach((node, i) => {
            node.__passportOriginal = node.nodeValue;
            node.nodeValue = res.translations[i];
          });
        }
      } catch { /* ignore */ }
      await sleep(BATCH_DELAY_MS);
    }
  }, 600);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
