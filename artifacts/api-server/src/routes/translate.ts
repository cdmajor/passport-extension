import { Router } from "express";
import { LANGUAGES, nameForCode, resolveLangCode } from "../lib/languages";

const router = Router();

const TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single";

/**
 * Translate via Google's public web endpoint (client=gtx).
 * No API key required — same engine as translate.google.com.
 */
async function translateOne(text: string, targetCode: string): Promise<string> {
  const url = new URL(TRANSLATE_URL);
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "auto");
  url.searchParams.set("tl", targetCode);
  url.searchParams.set("dt", "t");
  url.searchParams.set("ie", "UTF-8");
  url.searchParams.set("oe", "UTF-8");
  url.searchParams.set("q", text);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Translation service HTTP ${res.status}`);

  const data = (await res.json()) as unknown[][];
  if (!Array.isArray(data?.[0])) {
    throw new Error("Unexpected translation response");
  }

  return (data[0] as unknown[][]).map((part) => (part?.[0] as string) ?? "").join("");
}

async function translateTexts(texts: string[], targetLanguage: string): Promise<string[]> {
  const targetCode = resolveLangCode(targetLanguage);
  const concurrency = 5;
  const translations = new Array<string>(texts.length);

  for (let i = 0; i < texts.length; i += concurrency) {
    const slice = texts.slice(i, i + concurrency);
    const results = await Promise.all(slice.map((text) => translateOne(text, targetCode)));
    results.forEach((t, j) => {
      translations[i + j] = t;
    });
  }

  return translations;
}

async function detectLanguage(sample: string): Promise<string> {
  const url = new URL(TRANSLATE_URL);
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "auto");
  url.searchParams.set("tl", "en");
  url.searchParams.set("dt", "t");
  url.searchParams.set("ie", "UTF-8");
  url.searchParams.set("oe", "UTF-8");
  url.searchParams.set("q", sample.slice(0, 500));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Language detect HTTP ${res.status}`);

  const data = (await res.json()) as unknown[];
  // Response shape: [[["Hello","Hola",...]], null, "es", ...]
  const detected = data?.[2] as string | undefined;
  return nameForCode(detected);
}

// GET /api/languages
router.get("/languages", (_req, res) => {
  res.json({ languages: LANGUAGES });
});

// POST /api/translate
// Body: { texts: string[], targetLanguage: string }
router.post("/translate", async (req, res): Promise<void> => {
  const { texts, targetLanguage } = req.body as {
    texts?: unknown;
    targetLanguage?: unknown;
  };

  if (!Array.isArray(texts) || texts.length === 0) {
    res.status(400).json({ error: "texts must be a non-empty array" });
    return;
  }
  if (!targetLanguage) {
    res.status(400).json({ error: "targetLanguage is required" });
    return;
  }

  try {
    const translations = await translateTexts(texts as string[], String(targetLanguage));
    res.json({ translations });
  } catch (err) {
    req.log.error(err, "Translation error");
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/detect
// Body: { sample: string }
router.post("/detect", async (req, res): Promise<void> => {
  const { sample } = req.body as { sample?: unknown };
  if (!sample) {
    res.status(400).json({ error: "sample is required" });
    return;
  }

  try {
    const language = await detectLanguage(String(sample));
    res.json({ language });
  } catch (err) {
    req.log.error(err, "Detect error");
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
