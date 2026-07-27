import { LANGUAGES } from "../languages.js";

const nativeLang = document.getElementById("native-lang");
const autoTranslate = document.getElementById("auto-translate");
const saveBtn = document.getElementById("save");
const savedMsg = document.getElementById("saved-msg");

function populateLanguages() {
  nativeLang.innerHTML = '<option value="">— Select language —</option>';
  for (const lang of LANGUAGES) {
    const opt = document.createElement("option");
    opt.value = lang.name;
    opt.textContent = lang.name;
    nativeLang.appendChild(opt);
  }
}

populateLanguages();

chrome.storage.local.get(["nativeLanguage", "autoTranslate"], (prefs) => {
  if (prefs.nativeLanguage) nativeLang.value = prefs.nativeLanguage;
  autoTranslate.checked = !!prefs.autoTranslate;
});

saveBtn.addEventListener("click", () => {
  chrome.storage.local.set(
    {
      nativeLanguage: nativeLang.value,
      autoTranslate: autoTranslate.checked,
    },
    () => {
      savedMsg.classList.add("visible");
      setTimeout(() => savedMsg.classList.remove("visible"), 2000);
    }
  );
});
