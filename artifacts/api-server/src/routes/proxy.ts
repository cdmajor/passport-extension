import { Router } from "express";
import registry from "../lib/proxyRegistry";

const router = Router();

// GET /api/proxy/countries — list all available countries
router.get("/countries", (_req, res) => {
  const countries = Object.entries(registry).map(([code, config]) => ({
    code,
    name: config.name,
    flagEmoji: config.flagEmoji,
  }));
  res.json({ countries });
});

// GET /api/proxy/config/:countryCode — return proxy host/port for the extension
// IMPORTANT: Serve over HTTPS only in production so host/port are not exposed in transit.
router.get("/config/:countryCode", (req, res): void => {
  const code = req.params.countryCode.toUpperCase();
  const entry = registry[code];

  if (!entry) {
    res.status(404).json({ error: `No proxy configured for country: ${code}` });
    return;
  }

  res.json({
    host: entry.host,
    port: entry.port,
    protocol: entry.protocol,
  });
});

export default router;
