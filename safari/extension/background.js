/**
 * Passport — Safari background (MV3).
 *
 * Safari Web Extensions do not support chrome.proxy / PAC or
 * webRequestAuthProvider the way Chrome does. This build keeps Whop
 * membership, country preference (for translation context), and
 * translation. For IP/geo routing, use the companion Mac menu-bar app
 * (see safari/README.md).
 */

const API_BASE = "https://git-hub-publisher.replit.app/api";
const ACTIVATE_PATH = "/passport-activate";

const PLAN_IDS = {
  lite:     "plan_sCvQDQK8tMuGz",
  explorer: "plan_yWK8tkAhYFFHf",
  pro:      "plan_b38qgRyEYt5Da",
};

// ─── State ────────────────────────────────────────────────────────────────────

let activeCountry      = null;
let subscriptionActive = false;

// Restore on startup (no PAC reapplication — Safari cannot set proxies)
chrome.storage.local.get(["activeCountry", "membershipId"], async (result) => {
  if (result.membershipId) {
    const sub = await verifyMembership(result.membershipId);
    subscriptionActive = sub.active;
    if (subscriptionActive) refreshUsage(result.membershipId);
  }
  if (result.activeCountry && subscriptionActive) {
    activeCountry = result.activeCountry;
  }
});

// ─── Auto-capture membership after checkout ───────────────────────────────────

chrome.webNavigation.onCompleted.addListener(
  async (details) => {
    try {
      const url = new URL(details.url);
      const membershipId = url.searchParams.get("membership_id");
      if (!membershipId) return;
      const sub = await verifyMembership(membershipId);
      if (sub.active) {
        await chrome.storage.local.set({ membershipId });
        subscriptionActive = true;
        chrome.tabs.remove(details.tabId);
        chrome.runtime.sendMessage({ type: "SUBSCRIPTION_ACTIVATED" }).catch(() => {});
      }
    } catch { /* ignore */ }
  },
  { url: [{ hostEquals: "git-hub-publisher.replit.app", pathPrefix: ACTIVATE_PATH }] }
);

// ─── Message Handling ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {

    case "GET_STATUS":
      chrome.storage.local.get(["membershipId"], async ({ membershipId }) => {
        let usage = null;
        if (membershipId && subscriptionActive) {
          usage = await fetchUsage(membershipId).catch(() => null);
        }
        sendResponse({
          activeCountry,
          subscriptionActive,
          usage,
          platform: "safari",
          proxyViaExtension: false,
        });
      });
      return true;

    case "CHECK_SUBSCRIPTION":
      chrome.storage.local.get(["membershipId"], async ({ membershipId }) => {
        if (!membershipId) { sendResponse({ active: false }); return; }
        const sub = await verifyMembership(membershipId);
        subscriptionActive = sub.active;
        let usage = null;
        if (sub.active) usage = await fetchUsage(membershipId).catch(() => null);
        sendResponse({ ...sub, usage });
      });
      return true;

    case "START_CHECKOUT":
      startCheckout(message.plan)
        .then((url) => sendResponse({ ok: true, url }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;

    case "SET_COUNTRY":
      if (!subscriptionActive) {
        sendResponse({ ok: false, error: "subscription_required" });
        return false;
      }
      setCountry(message.country)
        .then((result) => sendResponse({ ok: true, ...result }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;

    case "CLEAR_COUNTRY":
      clearCountry()
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

// ─── Subscription ─────────────────────────────────────────────────────────────

async function verifyMembership(membershipId) {
  try {
    const res = await fetch(`${API_BASE}/whop/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membership_id: membershipId }),
    });
    if (!res.ok) return { active: false };
    return await res.json();
  } catch { return { active: false }; }
}

async function fetchUsage(membershipId) {
  const res = await fetch(`${API_BASE}/usage`, {
    headers: { Authorization: `Bearer ${membershipId}` },
  });
  if (!res.ok) return null;
  return await res.json();
}

async function refreshUsage(membershipId) {
  const usage = await fetchUsage(membershipId).catch(() => null);
  if (usage) chrome.runtime.sendMessage({ type: "USAGE_UPDATED", usage }).catch(() => {});
}

async function startCheckout(planKey) {
  const planId = PLAN_IDS[planKey] ?? PLAN_IDS.explorer;
  const res = await fetch(`${API_BASE}/whop/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan_id: planId }),
  });
  if (!res.ok) throw new Error("Failed to create checkout session");
  const data = await res.json();
  chrome.tabs.create({ url: data.purchase_url });
  return data.purchase_url;
}

// ─── Country preference (no PAC / no /proxy/config) ───────────────────────────

/**
 * Persist the selected country for UI + translation context.
 * Does NOT call /proxy/config — Safari cannot apply PAC, and requesting a
 * Smartproxy session would burn a paid slot with no effect in-browser.
 */
async function setCountry(country) {
  activeCountry = country;
  await chrome.storage.local.set({ activeCountry, platform: "safari" });

  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, { type: "COUNTRY_CHANGED", country }).catch(() => {});
  }

  return {
    proxyApplied: false,
    note: "Country saved. For IP routing in Safari, use the Passport Mac menu-bar app.",
  };
}

async function clearCountry() {
  activeCountry = null;
  await chrome.storage.local.remove("activeCountry");
}

// ─── Usage Notifications ──────────────────────────────────────────────────────

chrome.notifications.onButtonClicked.addListener((notifId) => {
  if (notifId === "passport-warn-80" || notifId === "passport-limit") {
    chrome.storage.local.get(["membershipId"], async ({ membershipId }) => {
      if (!membershipId) return;
      const sub = await verifyMembership(membershipId);
      const upgradeUrl = sub.upgrade_url ?? `https://whop.com/checkout/${PLAN_IDS.explorer}`;
      chrome.tabs.create({ url: upgradeUrl });
    });
  }
});

// ─── Translation ──────────────────────────────────────────────────────────────

const BATCH_SIZE = 40;

async function translateBatch(texts, targetLanguage) {
  const results = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const chunk = texts.slice(i, i + BATCH_SIZE);
    results.push(...await callTranslateAPI(chunk, targetLanguage));
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
