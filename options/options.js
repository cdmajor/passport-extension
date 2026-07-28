// Passport options

const TIER_HINTS = { lite: "Lite · 3 GB / mo", explorer: "Explorer · 10 GB / mo", pro: "Pro · 30 GB / mo" };

function setStatus(el, msg, type, autoClear = true) {
  if (!el) return;
  el.textContent = msg; el.className = "status " + (type || "");
  if (autoClear && type !== "err") setTimeout(() => { el.className = "status"; el.textContent = ""; }, 5000);
}

// ── Subscription ──────────────────────────────────────────────────────────────

function renderPlan(active, tier) {
  document.getElementById("planTitle").textContent = active ? "Active" : "Not subscribed";
  document.getElementById("planBadge").innerHTML = active
    ? '<span class="badge-active">ACTIVE</span>'
    : '<span class="badge-inactive">INACTIVE</span>';
  document.getElementById("planHint").textContent = active
    ? (TIER_HINTS[tier] || "Passport subscription active")
    : "Subscribe to start routing through any country";
  document.getElementById("buyPanel").style.display = active ? "none" : "block";
}

chrome.runtime.sendMessage({ type: "GET_STATUS" }, (res) => {
  if (chrome.runtime.lastError || !res) { renderPlan(false, null); return; }
  renderPlan(res.subscriptionActive, res.tier);
});

function startCheckout(tier) {
  setStatus(document.getElementById("subStatus"), "Opening checkout…", "info");
  chrome.runtime.sendMessage({ type: "START_CHECKOUT", tier }, (res) => {
    if (res?.ok) {
      setStatus(document.getElementById("subStatus"), "Checkout opened. It activates automatically after payment.", "info", false);
    } else {
      setStatus(document.getElementById("subStatus"), res?.error || "Could not open checkout.", "err");
    }
  });
}

document.getElementById("buyLiteBtn")?.addEventListener("click",     () => startCheckout("lite"));
document.getElementById("buyExplorerBtn")?.addEventListener("click", () => startCheckout("explorer"));
document.getElementById("buyProBtn")?.addEventListener("click",      () => startCheckout("pro"));

// Poll for activation after checkout opens (30 × 5s = 2.5 min)
let pollCount = 0;
const pollInterval = setInterval(() => {
  if (++pollCount > 30) { clearInterval(pollInterval); return; }
  chrome.runtime.sendMessage({ type: "GET_STATUS" }, (res) => {
    if (res?.subscriptionActive) { clearInterval(pollInterval); renderPlan(true, res.tier); setStatus(document.getElementById("subStatus"), "✓ Activated!", "ok"); }
  });
}, 5000);

// ── Translation settings ──────────────────────────────────────────────────────

chrome.storage.local.get(["nativeLanguage", "autoTranslate"], (prefs) => {
  const nativeLang = document.getElementById("native-lang");
  const autoTranslate = document.getElementById("auto-translate");
  if (prefs.nativeLanguage && nativeLang) nativeLang.value = prefs.nativeLanguage;
  if (autoTranslate) autoTranslate.checked = !!prefs.autoTranslate;
});

document.getElementById("save")?.addEventListener("click", () => {
  const nativeLang = document.getElementById("native-lang");
  const autoTranslate = document.getElementById("auto-translate");
  chrome.storage.local.set({ nativeLanguage: nativeLang?.value ?? "", autoTranslate: autoTranslate?.checked ?? false }, () => {
    const msg = document.getElementById("saved-msg");
    if (msg) { msg.classList.add("visible"); setTimeout(() => msg.classList.remove("visible"), 2000); }
  });
});
