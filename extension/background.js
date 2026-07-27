// Passport — background service worker
// Handles proxy switching and relays translation requests to the API.

const API_BASE = "__API_BASE__"; // Replaced with real URL at download time

// ─── State ───────────────────────────────────────────────────────────────────

let activeCountry = null; // { code, name, flagEmoji }

// Restore persisted state on startup
chrome.storage.local.get(["activeCountry"], (result) => {
  if (result.activeCountry) {
    activeCountry = result.activeCountry;
    applyProxy(activeCountry.code);
  }
});

// ─── Message Handling ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case "GET_STATUS":
      sendResponse({ activeCountry });
      return false;

    case "SET_COUNTRY":
      setCountry(message.country)
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;

    case "CLEAR_COUNTRY":
      clearProxy()
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
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

// ─── Proxy Management ─────────────────────────────────────────────────────────

async function setCountry(country) {
  // Fetch proxy config from the server — credentials stay server-side
  const res = await fetch(`${API_BASE}/proxy/config/${country.code}`);
  if (!res.ok) throw new Error(`Could not load proxy config for ${country.code}`);
  const { host, port, protocol } = await res.json();

  await applyProxyConfig({ host, port, protocol });

  activeCountry = country;
  await chrome.storage.local.set({ activeCountry });

  // Notify all content scripts that the country changed
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, { type: "COUNTRY_CHANGED", country }).catch(() => {});
  }
}

function applyProxyConfig({ host, port, protocol }) {
  return new Promise((resolve, reject) => {
    // Build a PAC script — routes all traffic through the country proxy
    const proxyType = protocol === "socks5" ? "SOCKS5" : "PROXY";
    const pac = `function FindProxyForURL(url, host) { return "${proxyType} ${host}:${port}"; }`;

    chrome.proxy.settings.set(
      { value: { mode: "pac_script", pacScript: { data: pac } }, scope: "regular" },
      () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      }
    );
  });
}

// Re-apply proxy from stored country code (called on startup)
async function applyProxy(countryCode) {
  try {
    const res = await fetch(`${API_BASE}/proxy/config/${countryCode}`);
    if (res.ok) {
      const config = await res.json();
      await applyProxyConfig(config);
    }
  } catch {
    // If the server is unreachable, clear the proxy so the user isn't stuck
    await clearProxy();
  }
}

function clearProxy() {
  return new Promise((resolve, reject) => {
    chrome.proxy.settings.clear({ scope: "regular" }, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else {
        activeCountry = null;
        chrome.storage.local.remove("activeCountry");
        resolve();
      }
    });
  });
}

// ─── Translation ──────────────────────────────────────────────────────────────

const BATCH_SIZE = 40;

async function translateBatch(texts, targetLanguage) {
  const results = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const chunk = texts.slice(i, i + BATCH_SIZE);
    const translated = await callTranslateAPI(chunk, targetLanguage);
    results.push(...translated);
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
