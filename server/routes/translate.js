import { Router } from "express";
import {
  LANGUAGES,
  nameForCode,
  resolveLangCode,
} from "../languages.js";

const router = Router();

const TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single";

/**
 * Translate via Google's public web endpoint (client=gtx).
 * No API key required — same engine as translate.google.com.
 */
async function translateOne(text, targetCode) {
  const url = new URL(TRANSLATE_URL);
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "auto");
  url.searchParams.set("tl", targetCode);
  url.searchParams.set("dt", "t");
  url.searchParams.set("ie", "UTF-8");
  url.searchParams.set("oe", "UTF-8");
  url.searchParams.set("q", text);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Translation service HTTP ${res.status}`);

  const data = await res.json();
  if (!Array.isArray(data?.[0])) {
    throw new Error("Unexpected translation response");
  }

  return data[0].map((part) => part?.[0] ?? "").join("");
}

async function translateTexts(texts, targetLanguage) {
  const targetCode = resolveLangCode(targetLanguage);
  // Parallel with a modest concurrency limit to stay polite to the free endpoint
  const concurrency = 5;
  const translations = new Array(texts.length);

  for (let i = 0; i < texts.length; i += concurrency) {
    const slice = texts.slice(i, i + concurrency);
    const results = await Promise.all(
      slice.map((text) => translateOne(text, targetCode))
    );
    results.forEach((t, j) => {
      translations[i + j] = t;
    });
  }

  return translations;
}

async function detectLanguage(sample) {
  const url = new URL(TRANSLATE_URL);
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "auto");
  url.searchParams.set("tl", "en");
  url.searchParams.set("dt", "t");
  url.searchParams.set("ie", "UTF-8");
  url.searchParams.set("oe", "UTF-8");
  url.searchParams.set("q", sample.slice(0, 500));

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Language detect HTTP ${res.status}`);

  const data = await res.json();
  // Response shape: [[["Hello","Hola",...]], null, "es", ...]
  const detected = data?.[2];
  return nameForCode(detected);
}

// GET /api/languages — list supported translation targets
router.get("/languages", (_req, res) => {
  res.json({ languages: LANGUAGES });
});

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
