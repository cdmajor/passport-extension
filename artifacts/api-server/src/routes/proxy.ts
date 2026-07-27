import { Router } from "express";
import registry, { isProxyConfigured } from "../lib/proxyRegistry";
import { getWhopClient } from "../lib/whopClient";

const router = Router();

// GET /api/proxy/countries — list all available countries
router.get("/countries", (_req, res) => {
  const configured = isProxyConfigured();
  const countries = Object.entries(registry).map(([code, config]) => ({
    code,
    name: config.name,
    flagEmoji: config.flagEmoji,
    available: configured,
  }));
  res.json({ countries });
});

// GET /api/proxy/config/:countryCode
// Returns proxy host/port/credentials for the extension.
// Requires a valid active Whop membership_id in the Authorization header:
//   Authorization: Bearer mem_xxx
router.get("/config/:countryCode", async (req, res): Promise<void> => {
  // Verify subscription
  const auth = req.headers.authorization ?? "";
  const membershipId = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!membershipId) {
    res.status(401).json({ error: "Missing membership_id in Authorization header" });
    return;
  }

  try {
    const client = await getWhopClient();
    const membership = await client.memberships.retrieve(membershipId);
    const active = membership.status === "active" || membership.status === "trialing";
    if (!active) {
      res.status(403).json({ error: "Subscription inactive" });
      return;
    }
  } catch {
    res.status(403).json({ error: "Could not verify subscription" });
    return;
  }

  const code = req.params.countryCode.toUpperCase();
  const entry = registry[code];

  if (!entry) {
    res.status(404).json({ error: `No proxy configured for country: ${code}` });
    return;
  }

  if (!isProxyConfigured()) {
    res.status(503).json({ error: "Proxy not configured on server" });
    return;
  }

  res.json({
    host: entry.host,
    port: entry.port,
    protocol: entry.protocol,
    username: entry.username,
    password: entry.password,
  });
});

export default router;
