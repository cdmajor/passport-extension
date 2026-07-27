import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
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
      return res.status(500).json({ error: "Translation response length mismatch" });
    }

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
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: 'Identify the language of the following text. Respond with ONLY a JSON object: {"language": "<language name in English>"}',
        },
        { role: "user", content: sample.slice(0, 500) },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    });

    const data = JSON.parse(completion.choices[0].message.content);
    res.json({ language: data.language ?? "Unknown" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
