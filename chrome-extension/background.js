// Passport — background service worker

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
let proxyCredentials   = null; // { username, password } — only set if proxy returns them

// Restore on startup
chrome.storage.local.get(["activeCountry", "membershipId"], async (result) => {
  if (result.membershipId) {
    const sub = await verifyMembership(result.membershipId);
    subscriptionActive = sub.active;
    if (subscriptionActive) refreshUsage(result.membershipId);
  }
  if (result.activeCountry && subscriptionActive) {
    activeCountry = result.activeCountry;
    reapplyProxy(activeCountry.code);
  }
});

// ─── Proxy auth handler (in case proxy requires credentials) ──────────────────

chrome.webRequest.onAuthRequired.addListener(
  (details, callback) => {
    if (proxyCredentials && details.isProxy) {
      callback({ authCredentials: proxyCredentials });
    } else {
      callback({});
    }
  },
  { urls: ["<all_urls>"] },
  ["asyncBlocking"]
);

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
        sendResponse({ activeCountry, subscriptionActive, usage });
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
        .then((usage) => sendResponse({ ok: true, usage }))
        .catch((err) => {
          if (err.code === "bandwidth_limit_reached") {
            sendResponse({ ok: false, error: "bandwidth_limit_reached", upgradeUrl: err.upgradeUrl });
          } else {
            sendResponse({ ok: false, error: err.message });
          }
        });
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

// ─── Proxy Management ─────────────────────────────────────────────────────────

async function setCountry(country) {
  const { membershipId } = await chrome.storage.local.get(["membershipId"]);
  const res = await fetch(`${API_BASE}/proxy/config/${country.code}`, {
    headers: { Authorization: `Bearer ${membershipId}` },
  });

  if (res.status === 402) {
    const data = await res.json();
    const err = new Error(data.message ?? "Bandwidth limit reached");
    err.code = "bandwidth_limit_reached";
    err.upgradeUrl = data.usage?.upgradeUrl;
    throw err;
  }

  if (!res.ok) throw new Error(`Could not load proxy config for ${country.code}`);

  const { host, port, protocol, username, password, usage } = await res.json();

  // Store credentials if the proxy requires auth
  proxyCredentials = username && password ? { username, password } : null;

  await applyProxyConfig({ host, port, protocol });
  activeCountry = country;
  await chrome.storage.local.set({ activeCountry });

  // Notify content scripts of country change
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, { type: "COUNTRY_CHANGED", country }).catch(() => {});
  }

  // Fire usage notifications and update popup
  if (usage) {
    handleUsageNotifications(usage);
    chrome.runtime.sendMessage({ type: "USAGE_UPDATED", usage }).catch(() => {});
  }

  return usage;
}

function applyProxyConfig({ host, port }) {
  return new Promise((resolve, reject) => {
    const pac = `function FindProxyForURL(url, host) { return "PROXY ${host}:${port}"; }`;
    chrome.proxy.settings.set(
      { value: { mode: "pac_script", pacScript: { data: pac } }, scope: "regular" },
      () => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve();
      }
    );
  });
}

async function reapplyProxy(countryCode) {
  try {
    const { membershipId } = await chrome.storage.local.get(["membershipId"]);
    // ?refresh=1 tells the server to skip session recording — this is a
    // browser-restart reapplication of an already-active proxy, not new usage.
    const res = await fetch(`${API_BASE}/proxy/config/${countryCode}?refresh=1`, {
      headers: { Authorization: `Bearer ${membershipId}` },
    });
    if (res.ok) {
      const config = await res.json();
      proxyCredentials = config.username && config.password
        ? { username: config.username, password: config.password } : null;
      await applyProxyConfig(config);
    }
  } catch { await clearProxy(); }
}

function clearProxy() {
  return new Promise((resolve, reject) => {
    chrome.proxy.settings.clear({ scope: "regular" }, () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else {
        activeCountry = null;
        proxyCredentials = null;
        chrome.storage.local.remove("activeCountry");
        resolve();
      }
    });
  });
}

// ─── Usage Notifications ──────────────────────────────────────────────────────

function handleUsageNotifications(usage) {
  if (usage.justHit80) {
    chrome.notifications.create("passport-warn-80", {
      type:    "basic",
      iconUrl: "../icons/icon48.png",
      title:   "Passport — 80% of data used",
      message: `You've used ${usage.gbEstimate} GB of your ${usage.gbLimit} GB ${usage.tier} plan. Upgrade to keep browsing without interruption.`,
      buttons: [{ title: "Upgrade plan" }],
      priority: 1,
    });
  }
  if (usage.atLimit) {
    chrome.notifications.create("passport-limit", {
      type:    "basic",
      iconUrl: "../icons/icon48.png",
      title:   "Passport — Data limit reached",
      message: `You've used all ${usage.gbLimit} GB on your ${usage.tier} plan this month. Upgrade to continue browsing.`,
      buttons: [{ title: "Upgrade now" }],
      priority: 2,
    });
  }
}

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
