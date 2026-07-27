import { LANGUAGES } from "../languages.js";

const API_BASE = "https://git-hub-publisher.replit.app/api";

const nativeLang    = document.getElementById("native-lang");
const autoTranslate = document.getElementById("auto-translate");
const saveBtn       = document.getElementById("save");
const savedMsg      = document.getElementById("saved-msg");
const subStatusBox  = document.getElementById("sub-status-box");
const subActions    = document.getElementById("sub-actions");
const membershipInput = document.getElementById("membership-id");
const verifyBtn     = document.getElementById("verify-btn");
const verifyMsg     = document.getElementById("verify-msg");

// ─── Language select ──────────────────────────────────────────────────────────

nativeLang.innerHTML = '<option value="">— Select language —</option>';
for (const lang of LANGUAGES) {
  const opt = document.createElement("option");
  opt.value = lang.name;
  opt.textContent = lang.name;
  nativeLang.appendChild(opt);
}

chrome.storage.local.get(["nativeLanguage", "autoTranslate", "membershipId"], async (prefs) => {
  if (prefs.nativeLanguage) nativeLang.value = prefs.nativeLanguage;
  autoTranslate.checked = !!prefs.autoTranslate;
  await checkSubscription(prefs.membershipId);
});

// ─── Subscription status ──────────────────────────────────────────────────────

async function checkSubscription(membershipId) {
  if (!membershipId) {
    showInactive();
    return;
  }

  subStatusBox.textContent = "Checking…";
  subStatusBox.className = "subscription-status inactive";

  try {
    const res = await fetch(`${API_BASE}/whop/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membership_id: membershipId }),
    });
    const data = await res.json();

    if (data.active) {
      subStatusBox.textContent = `✓ Passport Pro — Active${data.expires_at ? " · Renews " + new Date(data.expires_at).toLocaleDateString() : ""}`;
      subStatusBox.className = "subscription-status active";
      subActions.innerHTML = `<button class="btn btn-danger" id="cancel-btn">Cancel Subscription</button>`;
      document.getElementById("cancel-btn").addEventListener("click", () => {
        window.open("https://whop.com/dashboard", "_blank");
      });
    } else {
      showInactive();
    }
  } catch {
    subStatusBox.textContent = "Could not verify subscription.";
    subStatusBox.className = "subscription-status inactive";
  }
}

function showInactive() {
  subStatusBox.textContent = "No active subscription.";
  subStatusBox.className = "subscription-status inactive";
  subActions.innerHTML = `<button class="btn btn-primary" id="subscribe-btn" style="margin-top:12px">Subscribe — $9.99 / month</button>`;
  document.getElementById("subscribe-btn").addEventListener("click", async () => {
    const res = await fetch(`${API_BASE}/whop/checkout`, { method: "POST" });
    const data = await res.json();
    if (data.purchase_url) window.open(data.purchase_url, "_blank");
  });
}

// ─── Restore / verify membership ──────────────────────────────────────────────

verifyBtn.addEventListener("click", async () => {
  const id = membershipInput.value.trim();
  if (!id) { verifyMsg.textContent = "Enter a membership ID."; verifyMsg.className = "msg msg-err"; return; }

  verifyBtn.disabled = true;
  verifyMsg.textContent = "Verifying…";
  verifyMsg.className = "msg";

  try {
    const res = await fetch(`${API_BASE}/whop/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membership_id: id }),
    });
    const data = await res.json();

    if (data.active) {
      await new Promise((resolve) => chrome.storage.local.set({ membershipId: id }, resolve));
      verifyMsg.textContent = "✓ Subscription restored!";
      verifyMsg.className = "msg msg-ok";
      checkSubscription(id);
    } else {
      verifyMsg.textContent = "Membership not found or inactive.";
      verifyMsg.className = "msg msg-err";
    }
  } catch {
    verifyMsg.textContent = "Verification failed. Check your connection.";
    verifyMsg.className = "msg msg-err";
  } finally {
    verifyBtn.disabled = false;
  }
});

// ─── Save settings ────────────────────────────────────────────────────────────

saveBtn.addEventListener("click", () => {
  chrome.storage.local.set(
    { nativeLanguage: nativeLang.value, autoTranslate: autoTranslate.checked },
    () => {
      savedMsg.style.opacity = "1";
      setTimeout(() => { savedMsg.style.opacity = "0"; }, 2000);
    }
  );
});
