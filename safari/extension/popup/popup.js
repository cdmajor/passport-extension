// Passport popup

const API_BASE = "https://git-hub-publisher.replit.app/api";

const PLAN_IDS = {
  lite:     "plan_sCvQDQK8tMuGz",
  explorer: "plan_yWK8tkAhYFFHf",
  pro:      "plan_b38qgRyEYt5Da",
};

const COUNTRIES = [
  { code: "US", name: "United States",   flagEmoji: "🇺🇸" },
  { code: "GB", name: "United Kingdom",  flagEmoji: "🇬🇧" },
  { code: "CA", name: "Canada",          flagEmoji: "🇨🇦" },
  { code: "AU", name: "Australia",       flagEmoji: "🇦🇺" },
  { code: "DE", name: "Germany",         flagEmoji: "🇩🇪" },
  { code: "FR", name: "France",          flagEmoji: "🇫🇷" },
  { code: "JP", name: "Japan",           flagEmoji: "🇯🇵" },
  { code: "KR", name: "South Korea",     flagEmoji: "🇰🇷" },
  { code: "BR", name: "Brazil",          flagEmoji: "🇧🇷" },
  { code: "MX", name: "Mexico",          flagEmoji: "🇲🇽" },
  { code: "IN", name: "India",           flagEmoji: "🇮🇳" },
  { code: "SG", name: "Singapore",       flagEmoji: "🇸🇬" },
  { code: "NL", name: "Netherlands",     flagEmoji: "🇳🇱" },
  { code: "IT", name: "Italy",           flagEmoji: "🇮🇹" },
  { code: "ES", name: "Spain",           flagEmoji: "🇪🇸" },
  { code: "SE", name: "Sweden",          flagEmoji: "🇸🇪" },
  { code: "NO", name: "Norway",          flagEmoji: "🇳🇴" },
  { code: "CH", name: "Switzerland",     flagEmoji: "🇨🇭" },
  { code: "PL", name: "Poland",          flagEmoji: "🇵🇱" },
  { code: "ZA", name: "South Africa",    flagEmoji: "🇿🇦" },
  { code: "NG", name: "Nigeria",         flagEmoji: "🇳🇬" },
  { code: "AR", name: "Argentina",       flagEmoji: "🇦🇷" },
  { code: "TR", name: "Turkey",          flagEmoji: "🇹🇷" },
  { code: "ID", name: "Indonesia",       flagEmoji: "🇮🇩" },
  { code: "PH", name: "Philippines",     flagEmoji: "🇵🇭" },
  { code: "TH", name: "Thailand",        flagEmoji: "🇹🇭" },
  { code: "VN", name: "Vietnam",         flagEmoji: "🇻🇳" },
  { code: "NZ", name: "New Zealand",     flagEmoji: "🇳🇿" },
  { code: "PT", name: "Portugal",        flagEmoji: "🇵🇹" },
  { code: "RO", name: "Romania",         flagEmoji: "🇷🇴" },
];

// DOM refs
const subscribeWall   = document.getElementById("subscribe-wall");
const mainUI          = document.getElementById("main-ui");
const subscribeStatus = document.getElementById("subscribe-status");
const restoreBtn      = document.getElementById("restore-btn");
const statusBadge     = document.getElementById("status-badge");
const activeCountryEl = document.getElementById("active-country");
const activeFlagEl    = document.getElementById("active-flag");
const activeNameEl    = document.getElementById("active-name");
const disconnectBtn   = document.getElementById("disconnect-btn");
const searchInput     = document.getElementById("search");
const countryList     = document.getElementById("country-list");
const autoTranslate   = document.getElementById("auto-translate");
const openOptions     = document.getElementById("open-options");
const usageWrap       = document.getElementById("usage-bar-wrap");
const usageLabel      = document.getElementById("usage-label");
const usageTier       = document.getElementById("usage-tier");
const usageFill       = document.getElementById("usage-fill");
const usageLimitMsg   = document.getElementById("usage-limit-msg");
const upgradeLink     = document.getElementById("upgrade-link");

let activeCountry = null;
let filtered = [...COUNTRIES];

// ─── Init ─────────────────────────────────────────────────────────────────────

chrome.runtime.sendMessage({ type: "GET_STATUS" }, (res) => {
  activeCountry = res?.activeCountry ?? null;
  if (res?.subscriptionActive) {
    showMainUI(res.usage);
  } else {
    chrome.runtime.sendMessage({ type: "CHECK_SUBSCRIPTION" }, (sub) => {
      sub?.active ? showMainUI(sub.usage) : showSubscribeWall();
    });
  }
});

chrome.storage.local.get(["autoTranslate"], (res) => {
  if (autoTranslate) autoTranslate.checked = !!res.autoTranslate;
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SUBSCRIPTION_ACTIVATED") showMainUI(null);
  if (msg.type === "USAGE_UPDATED") renderUsage(msg.usage);
});

// ─── Subscribe wall ───────────────────────────────────────────────────────────

function showSubscribeWall() {
  subscribeWall.classList.remove("hidden");
  mainUI.classList.add("hidden");
}

function showMainUI(usage) {
  subscribeWall.classList.add("hidden");
  mainUI.classList.remove("hidden");
  renderStatus();
  renderList();
  if (usage) renderUsage(usage);
}

document.querySelectorAll(".btn-tier").forEach((btn) => {
  btn.addEventListener("click", () => {
    const plan = btn.dataset.plan;
    subscribeStatus.textContent = "Opening checkout…";
    chrome.runtime.sendMessage({ type: "START_CHECKOUT", plan }, (res) => {
      if (res?.ok) {
        subscribeStatus.textContent = "Complete your purchase in the new tab.";
      } else {
        subscribeStatus.textContent = "Could not start checkout. Try again.";
      }
    });
  });
});

restoreBtn.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// ─── Usage meter ──────────────────────────────────────────────────────────────

function renderUsage(usage) {
  if (!usage) return;
  usageWrap.classList.remove("hidden");

  const pct = usage.percentUsed;
  usageLabel.textContent = `${usage.gbEstimate} / ${usage.gbLimit} GB used`;
  usageTier.textContent  = usage.tier;
  usageFill.style.width  = `${pct}%`;
  usageFill.className    = "usage-fill" + (pct >= 100 ? " danger" : pct >= 80 ? " warn" : "");

  if (usage.atLimit) {
    usageLimitMsg.classList.remove("hidden");
    upgradeLink.href = usage.upgradeUrl;
    upgradeLink.onclick = (e) => { e.preventDefault(); chrome.tabs.create({ url: usage.upgradeUrl }); };
  } else {
    usageLimitMsg.classList.add("hidden");
  }
}

// ─── Country list ─────────────────────────────────────────────────────────────

searchInput.addEventListener("input", () => {
  const q = searchInput.value.toLowerCase().trim();
  filtered = q
    ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
    : [...COUNTRIES];
  renderList();
});

disconnectBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "CLEAR_COUNTRY" }, () => {
    activeCountry = null;
    renderStatus();
    renderList();
  });
});

autoTranslate.addEventListener("change", () => {
  chrome.storage.local.set({ autoTranslate: autoTranslate.checked });
});

openOptions.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

function renderStatus() {
  if (activeCountry) {
    statusBadge.textContent = "On";
    statusBadge.className   = "badge badge-on";
    activeFlagEl.textContent = activeCountry.flagEmoji;
    activeNameEl.textContent = activeCountry.name;
    activeCountryEl.classList.remove("hidden");
  } else {
    statusBadge.textContent = "Off";
    statusBadge.className   = "badge badge-off";
    activeCountryEl.classList.add("hidden");
  }
}

function renderList() {
  countryList.innerHTML = "";
  for (const country of filtered) {
    const li = document.createElement("li");
    li.className = "country-item" + (activeCountry?.code === country.code ? " active" : "");
    li.innerHTML = `
      <span class="flag">${country.flagEmoji}</span>
      <span class="name">${country.name}</span>
      ${activeCountry?.code === country.code ? '<span class="checkmark">✓</span>' : ""}
    `;
    li.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "SET_COUNTRY", country }, (res) => {
        if (res?.ok) {
          activeCountry = country;
          renderStatus();
          renderList();
          if (res.usage) renderUsage(res.usage);
        } else if (res?.error === "bandwidth_limit_reached") {
          chrome.tabs.create({ url: res.upgradeUrl });
        }
      });
    });
    countryList.appendChild(li);
  }
}
