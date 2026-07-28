// Passport — background service worker
const API_BASE = "https://gulliversoftwaretech.com/api";
const PASSPORT_FREE = false; // Set true in admin-free build

let activeCountry = null;
let subscriptionActive = PASSPORT_FREE;

// Restore on startup — proxy is only applied AFTER subscription is confirmed
chrome.storage.local.get(["activeCountry", "passportMembershipId", "passport_plan_cache"], (result) => {
  if (PASSPORT_FREE) {
    subscriptionActive = true;
    if (result.activeCountry) { activeCountry = result.activeCountry; applyProxy(activeCountry.code); }
    return;
  }
  const cache = result.passport_plan_cache;
  if (cache?.active) {
    subscriptionActive = true;
    if (result.activeCountry) { activeCountry = result.activeCountry; applyProxy(activeCountry.code); }
    // Re-verify in background if older than 1 hour
    if (!cache.verifiedAt || Date.now() - cache.verifiedAt > 60 * 60 * 1000) {
      if (result.passportMembershipId) {
        verifyMembership(result.passportMembershipId).then((data) => {
          subscriptionActive = !!data?.active;
          chrome.storage.local.set({ passport_plan_cache: { active: subscriptionActive, tier: data?.tier ?? null, verifiedAt: Date.now() } });
          if (!subscriptionActive && activeCountry) clearProxy();
        }).catch(() => {});
      }
    }
  }
});

async function verifyMembership(membershipId) {
  try {
    const res = await fetch(`${API_BASE}/passport/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membership_id: membershipId }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function doCheckout(tier = "lite") {
  try {
    const res = await fetch(`${API_BASE}/passport/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    if (!res.ok) return null;
    return (await res.json()).purchase_url ?? null;
  } catch { return null; }
}

// Auto-activate after Whop checkout redirect
// (calls storage directly — service workers can't receive their own sendMessage)
async function activateMembership(membershipId) {
  if (!membershipId) return;
  const data = await verifyMembership(membershipId);
  if (data?.active) {
    subscriptionActive = true;
    await chrome.storage.local.set({
      passportMembershipId: membershipId,
      passport_plan_cache: { active: true, tier: data.tier ?? "lite", verifiedAt: Date.now() },
    });
    chrome.runtime.sendMessage({ type: "SUBSCRIPTION_ACTIVATED" }).catch(() => {});
  }
}

chrome.webNavigation.onCompleted.addListener(
  (details) => {
    if (details.frameId !== 0) return;
    try {
      const url = new URL(details.url);
      const membershipId = url.searchParams.get("membership_id");
      if (membershipId) activateMembership(membershipId).catch(() => {});
    } catch (_) {}
  },
  { url: [{ pathContains: "/passport-activate" }] }
);

// ─── Message Handling ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {

    case "GET_STATUS":
      chrome.storage.local.get(["passport_plan_cache"], (result) => {
        const cache = result.passport_plan_cache ?? {};
        sendResponse({
          subscriptionActive: PASSPORT_FREE || subscriptionActive,
          tier: cache.tier ?? null,
          activeCountry,
        });
      });
      return true;

    case "START_CHECKOUT":
      doCheckout(message.tier || "lite").then((url) => {
        if (url) { chrome.tabs.create({ url }); sendResponse({ ok: true }); }
        else { sendResponse({ ok: false, error: "Could not start checkout. Please try again." }); }
      }).catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;

    case "SET_COUNTRY":
      if (!subscriptionActive) { sendResponse({ ok: false, error: "subscription_required" }); return true; }
      setCountry(message.country)
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;

    case "CLEAR_COUNTRY":
      clearProxy().then(() => sendResponse({ ok: true })).catch((err) => sendResponse({ ok: false, error: err.message }));
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
  const { passportMembershipId } = await chrome.storage.local.get(["passportMembershipId"]);
  const headers = passportMembershipId ? { "Authorization": `Bearer ${passportMembershipId}` } : {};
  const res = await fetch(`${API_BASE}/passport/proxy/config/${country.code}`, { headers });
  if (!res.ok) throw new Error(`Could not load proxy config for ${country.code}`);
  const config = await res.json();
  const { host, port, protocol, username, password } = config;
  proxyCredentials = (username && password) ? { username, password } : null;
  await applyProxyConfig({ host, port, protocol });
  activeCountry = country;
  await chrome.storage.local.set({ activeCountry });
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) chrome.tabs.sendMessage(tab.id, { type: "COUNTRY_CHANGED", country }).catch(() => {});
}

function applyProxyConfig({ host, port, protocol }) {
  return new Promise((resolve, reject) => {
    const proxyType = protocol === "socks5" ? "SOCKS5" : "PROXY";
    const pac = `function FindProxyForURL(url, host) { return "${proxyType} ${host}:${port}"; }`;
    chrome.proxy.settings.set({ value: { mode: "pac_script", pacScript: { data: pac } }, scope: "regular" }, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });
}

// Proxy credentials supplied to onAuthRequired challenges
let proxyCredentials = null;

chrome.webRequest.onAuthRequired.addListener(
  (details, callback) => {
    if (details.isProxy && proxyCredentials) {
      callback({ authCredentials: proxyCredentials });
    } else {
      callback({});
    }
  },
  { urls: ["<all_urls>"] },
  ["asyncBlocking"]
);

async function applyProxy(countryCode) {
  try {
    const { passportMembershipId } = await chrome.storage.local.get(["passportMembershipId"]);
    const headers = passportMembershipId ? { "Authorization": `Bearer ${passportMembershipId}` } : {};
    const res = await fetch(`${API_BASE}/passport/proxy/config/${countryCode}`, { headers });
    if (res.ok) {
      const config = await res.json();
      proxyCredentials = (config.username && config.password)
        ? { username: config.username, password: config.password }
        : null;
      await applyProxyConfig(config);
    }
  } catch { await clearProxy(); }
}

function clearProxy() {
  proxyCredentials = null;
  return new Promise((resolve, reject) => {
    chrome.proxy.settings.clear({ scope: "regular" }, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else { activeCountry = null; chrome.storage.local.remove("activeCountry"); resolve(); }
    });
  });
}

// ─── Translation ──────────────────────────────────────────────────────────────

const BATCH_SIZE = 40;

async function translateBatch(texts, targetLanguage) {
  const results = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) results.push(...await callTranslateAPI(texts.slice(i, i + BATCH_SIZE), targetLanguage));
  return results;
}

async function callTranslateAPI(texts, targetLanguage) {
  const res = await fetch(`${API_BASE}/passport/translate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texts, targetLanguage }) });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `Server error ${res.status}`); }
  const data = await res.json();
  if (!Array.isArray(data.translations)) throw new Error("Unexpected response format.");
  return data.translations;
}

async function detectLanguage(sample) {
  const res = await fetch(`${API_BASE}/passport/detect`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sample }) });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return (await res.json()).language ?? "Unknown";
}
