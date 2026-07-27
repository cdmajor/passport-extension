import { Router } from "express";
import registry from "../proxies/registry.js";

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
// The extension uses this to build its PAC script.
// IMPORTANT: Serve this endpoint over HTTPS only in production so credentials
// are not exposed in transit. The response is intentionally minimal — no passwords
// are returned; the PAC script only needs host + port for unauthenticated proxies.
// For authenticated proxies, route traffic through a local relay (see README).
router.get("/config/:countryCode", (req, res) => {
  const code = req.params.countryCode.toUpperCase();
  const entry = registry[code];

  if (!entry) {
    return res.status(404).json({ error: `No proxy configured for country: ${code}` });
  }

  res.json({
    host: entry.host,
    port: entry.port,
    protocol: entry.protocol, // "socks5" | "http"
  });
});

export default router;
