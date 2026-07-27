import { Router } from "express";
import { getProxyForCountry, isSmartproxyConfigured } from "../lib/smartproxy";
import { getWhopClient } from "../lib/whopClient";
import { recordSession, getUsage } from "../lib/usageTracker";
import { PLANS } from "../lib/plans";

const router = Router();

const COUNTRIES: Record<string, { name: string; flagEmoji: string }> = {
  US: { name: "United States",  flagEmoji: "🇺🇸" },
  GB: { name: "United Kingdom", flagEmoji: "🇬🇧" },
  CA: { name: "Canada",         flagEmoji: "🇨🇦" },
  AU: { name: "Australia",      flagEmoji: "🇦🇺" },
  DE: { name: "Germany",        flagEmoji: "🇩🇪" },
  FR: { name: "France",         flagEmoji: "🇫🇷" },
  JP: { name: "Japan",          flagEmoji: "🇯🇵" },
  KR: { name: "South Korea",    flagEmoji: "🇰🇷" },
  BR: { name: "Brazil",         flagEmoji: "🇧🇷" },
  IN: { name: "India",          flagEmoji: "🇮🇳" },
  SG: { name: "Singapore",      flagEmoji: "🇸🇬" },
  NL: { name: "Netherlands",    flagEmoji: "🇳🇱" },
  MX: { name: "Mexico",         flagEmoji: "🇲🇽" },
  ZA: { name: "South Africa",   flagEmoji: "🇿🇦" },
  IT: { name: "Italy",          flagEmoji: "🇮🇹" },
  ES: { name: "Spain",          flagEmoji: "🇪🇸" },
  SE: { name: "Sweden",         flagEmoji: "🇸🇪" },
  NO: { name: "Norway",         flagEmoji: "🇳🇴" },
  CH: { name: "Switzerland",    flagEmoji: "🇨🇭" },
  PL: { name: "Poland",         flagEmoji: "🇵🇱" },
  TR: { name: "Turkey",         flagEmoji: "🇹🇷" },
  PT: { name: "Portugal",       flagEmoji: "🇵🇹" },
  AR: { name: "Argentina",      flagEmoji: "🇦🇷" },
  ID: { name: "Indonesia",      flagEmoji: "🇮🇩" },
  PH: { name: "Philippines",    flagEmoji: "🇵🇭" },
  TH: { name: "Thailand",       flagEmoji: "🇹🇭" },
  VN: { name: "Vietnam",        flagEmoji: "🇻🇳" },
  NZ: { name: "New Zealand",    flagEmoji: "🇳🇿" },
  NG: { name: "Nigeria",        flagEmoji: "🇳🇬" },
  RO: { name: "Romania",        flagEmoji: "🇷🇴" },
};

// GET /api/proxy/countries
router.get("/countries", (_req, res) => {
  const available = isSmartproxyConfigured();
  const countries = Object.entries(COUNTRIES).map(([code, { name, flagEmoji }]) => ({
    code, name, flagEmoji, available,
  }));
  res.json({ countries });
});

// GET /api/proxy/config/:countryCode
// Requires: Authorization: Bearer <membership_id>
// Records a session and enforces tier limits, then returns proxy + usage info.
// Pass ?refresh=1 to skip session recording (used on browser restart to
// reapply an already-active proxy without burning quota).
router.get("/config/:countryCode", async (req, res): Promise<void> => {
  const isRefresh = req.query.refresh === "1";
  const auth = req.headers.authorization ?? "";
  const membershipId = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!membershipId) {
    res.status(401).json({ error: "Missing membership_id in Authorization header" });
    return;
  }

  // Verify subscription and get plan
  let planId: string;
  try {
    const client = await getWhopClient();
    const membership = await client.memberships.retrieve(membershipId);
    const active = membership.status === "active" || membership.status === "trialing";
    if (!active) {
      res.status(403).json({ error: "Subscription inactive" });
      return;
    }
    planId = membership.plan?.id ?? "";
  } catch {
    res.status(403).json({ error: "Could not verify subscription" });
    return;
  }

  const plan = PLANS[planId];
  if (!plan) {
    res.status(400).json({ error: "Unknown plan — please re-subscribe" });
    return;
  }

  // Record session (skip on ?refresh=1 — browser restart reapplying existing proxy)
  const usage = isRefresh
    ? await getUsage(membershipId, plan)
    : await recordSession(membershipId, plan);

  if (usage.atLimit) {
    res.status(402).json({
      error:      "bandwidth_limit_reached",
      message:    `You've used all ${plan.gbLimit} GB on your ${plan.name} plan this month.`,
      usage,
    });
    return;
  }

  const code = req.params.countryCode.toUpperCase();
  if (!COUNTRIES[code]) {
    res.status(404).json({ error: `Unknown country: ${code}` });
    return;
  }

  if (!isSmartproxyConfigured()) {
    res.status(503).json({ error: "Proxy service not configured" });
    return;
  }

  try {
    const config = await getProxyForCountry(code);
    res.json({ ...config, usage });
  } catch (err) {
    req.log.error(err, "Smartproxy fetch error");
    res.status(502).json({ error: (err as Error).message });
  }
});

export default router;
