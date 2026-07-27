// Passport for Safari — translation companion.
// Country proxy is handled by the Passport Mac menu bar app (system-wide),
// because Safari does not support Chrome's chrome.proxy API.

const API_BASE = "__API_BASE__";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case "GET_STATUS":
      chrome.storage.local.get(["activeCountry"], (result) => {
        sendResponse({ activeCountry: result.activeCountry ?? null, proxyManagedByMacApp: true });
      });
      return true;

    case "SET_COUNTRY":
      // Safari cannot set a PAC proxy. Persist selection for translation context only.
      chrome.storage.local.set({ activeCountry: message.country }, () => {
        chrome.tabs.query({}, (tabs) => {
          for (const tab of tabs) {
            if (tab.id != null) {
              chrome.tabs.sendMessage(tab.id, { type: "COUNTRY_CHANGED", country: message.country }).catch(() => {});
            }
          }
        });
        sendResponse({
          ok: true,
          warning: "On Mac, connect via the Passport menu bar app to route traffic through this country.",
        });
      });
      return true;

    case "CLEAR_COUNTRY":
      chrome.storage.local.remove("activeCountry", () => sendResponse({ ok: true }));
      return true;

    case "TRANSLATE_BATCH":
      translateBatch(message.texts, message.targetLanguage)
        .then((translations) => sendResponse({ ok: true, translations }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;

    case "DETECT_LANGUAGE":
      detectLanguage(message.sample)
        .then((language) => sendResponse({ ok: true, language }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
  }
});

const BATCH_SIZE = 40;

async function translateBatch(texts, targetLanguage) {
  const results = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const chunk = texts.slice(i, i + BATCH_SIZE);
    results.push(...(await callTranslateAPI(chunk, targetLanguage)));
  }
  return results;
}

async function callTranslateAPI(texts, targetLanguage) {
  const res = await fetch(`${API_BASE}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts, targetLanguage }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data.translations)) throw new Error("Unexpected response format.");
  return data.translations;
}

async function detectLanguage(sample) {
  const res = await fetch(`${API_BASE}/detect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sample }),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  const data = await res.json();
  return data.language ?? "Unknown";
}
