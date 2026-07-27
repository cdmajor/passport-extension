import { Router } from "express";
import OpenAI from "openai";

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

function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

let openaiClient = null;

function getOpenAI() {
  if (!hasOpenAIKey()) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    });
  }
  return openaiClient;
}

function resolveLangCode(targetLanguage) {
  if (LANG_CODES[targetLanguage]) return LANG_CODES[targetLanguage];
  // Already a code, or unknown — pass through lowercased short form
  return String(targetLanguage).trim();
}

// ─── OpenAI (optional, preferred when OPENAI_API_KEY is set) ─────────────────

async function translateWithOpenAI(openai, texts, targetLanguage) {
  const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a professional translator. Translate the following numbered list of texts into ${targetLanguage}. Return ONLY the translated texts as a JSON array of strings in the same order, with no extra commentary.`,
      },
      { role: "user", content: numbered },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const raw = completion.choices[0].message.content;
  const parsed = JSON.parse(raw);
  const translations = parsed.translations ?? Object.values(parsed);

  if (!Array.isArray(translations) || translations.length !== texts.length) {
    throw new Error("Translation response length mismatch");
  }

  return translations;
}

async function detectWithOpenAI(openai, sample) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          'Identify the language of the following text. Respond with ONLY a JSON object: {"language": "<language name in English>"}',
      },
      { role: "user", content: sample.slice(0, 500) },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
  });

  const data = JSON.parse(completion.choices[0].message.content);
  return data.language ?? "Unknown";
}

// ─── Free fallback (MyMemory — no API key required) ──────────────────────────

async function translateOneMyMemory(text, targetCode) {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text.slice(0, 450)); // MyMemory free tier query limit
  url.searchParams.set("langpair", `Autodetect|${targetCode}`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);

  const data = await res.json();
  if (data.responseStatus !== 200 && data.responseStatus !== "200") {
    throw new Error(data.responseDetails || "MyMemory translation failed");
  }

  return data.responseData?.translatedText ?? text;
}

async function translateWithMyMemory(texts, targetLanguage) {
  const targetCode = resolveLangCode(targetLanguage);
  // Sequential to stay within free-tier rate limits
  const translations = [];
  for (const text of texts) {
    translations.push(await translateOneMyMemory(text, targetCode));
  }
  return translations;
}

async function detectWithMyMemory(sample) {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", sample.slice(0, 200));
  url.searchParams.set("langpair", "Autodetect|en");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);

  const data = await res.json();
  const matches = data.matches ?? [];
  const detected = matches.find((m) => m.source)?.source
    || data.responseData?.detectedLanguage;

  if (!detected) return "Unknown";

  const code = String(detected).toLowerCase();
  return CODE_TO_NAME[code] || CODE_TO_NAME[code.split("-")[0]] || detected;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/translate
// Body: { texts: string[], targetLanguage: string }
// Returns: { translations: string[], provider: "openai" | "mymemory" }
router.post("/translate", async (req, res) => {
  const { texts, targetLanguage } = req.body;

  if (!Array.isArray(texts) || texts.length === 0) {
    return res.status(400).json({ error: "texts must be a non-empty array" });
  }
  if (!targetLanguage) {
    return res.status(400).json({ error: "targetLanguage is required" });
  }

  try {
    const openai = getOpenAI();
    if (openai) {
      const translations = await translateWithOpenAI(openai, texts, targetLanguage);
      return res.json({ translations, provider: "openai" });
    }

    const translations = await translateWithMyMemory(texts, targetLanguage);
    return res.json({ translations, provider: "mymemory" });
  } catch (err) {
    console.error("Translation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/detect
// Body: { sample: string }
// Returns: { language: string, provider: "openai" | "mymemory" }
router.post("/detect", async (req, res) => {
  const { sample } = req.body;
  if (!sample) return res.status(400).json({ error: "sample is required" });

  try {
    const openai = getOpenAI();
    if (openai) {
      const language = await detectWithOpenAI(openai, sample);
      return res.json({ language, provider: "openai" });
    }

    const language = await detectWithMyMemory(sample);
    return res.json({ language, provider: "mymemory" });
  } catch (err) {
    console.error("Detect error:", err);
    res.status(500).json({ error: err.message });
  }
});

export { hasOpenAIKey };
export default router;
