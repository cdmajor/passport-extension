// Passport popup

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
  { code: "SE", name: "Sweden",          flagEmoji: "🇸🇪" },
  { code: "NO", name: "Norway",          flagEmoji: "🇳🇴" },
  { code: "CH", name: "Switzerland",     flagEmoji: "🇨🇭" },
  { code: "IT", name: "Italy",           flagEmoji: "🇮🇹" },
  { code: "ES", name: "Spain",           flagEmoji: "🇪🇸" },
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

const statusBadge   = document.getElementById("status-badge");
const activeCountryEl = document.getElementById("active-country");
const activeFlagEl  = document.getElementById("active-flag");
const activeNameEl  = document.getElementById("active-name");
const disconnectBtn = document.getElementById("disconnect-btn");
const searchInput   = document.getElementById("search");
const countryList   = document.getElementById("country-list");
const autoTranslate = document.getElementById("auto-translate");
const openOptions   = document.getElementById("open-options");

let activeCountry = null;
let filtered = [...COUNTRIES];

// ─── Init ─────────────────────────────────────────────────────────────────────

chrome.runtime.sendMessage({ type: "GET_STATUS" }, (res) => {
  activeCountry = res?.activeCountry ?? null;
  renderStatus();
  renderList();
});

chrome.storage.local.get(["autoTranslate"], (res) => {
  autoTranslate.checked = !!res.autoTranslate;
});

// ─── Event Listeners ──────────────────────────────────────────────────────────

searchInput.addEventListener("input", () => {
  const q = searchInput.value.toLowerCase().trim();
  filtered = q ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)) : [...COUNTRIES];
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

// ─── Render ───────────────────────────────────────────────────────────────────

function renderStatus() {
  if (activeCountry) {
    statusBadge.textContent = "On";
    statusBadge.className = "badge badge-on";
    activeFlagEl.textContent = activeCountry.flagEmoji;
    activeNameEl.textContent = activeCountry.name;
    activeCountryEl.classList.remove("hidden");
  } else {
    statusBadge.textContent = "Off";
    statusBadge.className = "badge badge-off";
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
    li.addEventListener("click", () => selectCountry(country));
    countryList.appendChild(li);
  }
}

function selectCountry(country) {
  if (activeCountry?.code === country.code) return;
  chrome.runtime.sendMessage({ type: "SET_COUNTRY", country }, (res) => {
    if (res?.ok) {
      activeCountry = country;
      renderStatus();
      renderList();
      if (res.warning) {
        // Soft hint — Mac app owns system proxy
        console.info(res.warning);
      }
    } else {
      alert("Could not update country: " + (res?.error ?? "Unknown error"));
    }
  });
}
