import { Router } from "express";

const router = Router();

// Language display names (from the extension options UI) → ISO 639-1 codes
const LANG_CODES = {
  English: "en",
  Spanish: "es",
  French: "fr",
  German: "de",
  Japanese: "ja",
  Korean: "ko",
  Portuguese: "pt",
  Italian: "it",
  "Chinese (Simplified)": "zh-CN",
  "Chinese (Traditional)": "zh-TW",
  Arabic: "ar",
  Hindi: "hi",
  Russian: "ru",
  Turkish: "tr",
  Dutch: "nl",
  Polish: "pl",
  Swedish: "sv",
  Vietnamese: "vi",
  Thai: "th",
  Indonesian: "id",
};

const CODE_TO_NAME = Object.fromEntries(
  Object.entries(LANG_CODES).map(([name, code]) => [code.toLowerCase(), name])
);

function resolveLangCode(targetLanguage) {
  if (LANG_CODES[targetLanguage]) return LANG_CODES[targetLanguage];
  return String(targetLanguage).trim();
}

// Free MyMemory translation — no API key, seamless for users
async function translateOne(text, targetCode) {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text.slice(0, 450));
  url.searchParams.set("langpair", `Autodetect|${targetCode}`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Translation service HTTP ${res.status}`);

  const data = await res.json();
  if (data.responseStatus !== 200 && data.responseStatus !== "200") {
    throw new Error(data.responseDetails || "Translation failed");
  }

  return data.responseData?.translatedText ?? text;
}

async function translateTexts(texts, targetLanguage) {
  const targetCode = resolveLangCode(targetLanguage);
  const translations = [];
  for (const text of texts) {
    translations.push(await translateOne(text, targetCode));
  }
  return translations;
}

async function detectLanguage(sample) {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", sample.slice(0, 200));
  url.searchParams.set("langpair", "Autodetect|en");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Language detect HTTP ${res.status}`);

  const data = await res.json();
  const matches = data.matches ?? [];
  const detected =
    matches.find((m) => m.source)?.source || data.responseData?.detectedLanguage;

  if (!detected) return "Unknown";

  const code = String(detected).toLowerCase();
  return CODE_TO_NAME[code] || CODE_TO_NAME[code.split("-")[0]] || detected;
}

// POST /api/translate
// Body: { texts: string[], targetLanguage: string }
// Returns: { translations: string[] }
router.post("/translate", async (req, res) => {
  const { texts, targetLanguage } = req.body;

  if (!Array.isArray(texts) || texts.length === 0) {
    return res.status(400).json({ error: "texts must be a non-empty array" });
  }
  if (!targetLanguage) {
    return res.status(400).json({ error: "targetLanguage is required" });
  }

  try {
    const translations = await translateTexts(texts, targetLanguage);
    res.json({ translations });
  } catch (err) {
    console.error("Translation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/detect
// Body: { sample: string }
// Returns: { language: string }
router.post("/detect", async (req, res) => {
  const { sample } = req.body;
  if (!sample) return res.status(400).json({ error: "sample is required" });

  try {
    const language = await detectLanguage(sample);
    res.json({ language });
  } catch (err) {
    console.error("Detect error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
