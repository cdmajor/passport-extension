import { Router } from "express";
import { getWhopClient } from "../lib/whopClient";

const router = Router();

const COMPANY_ID = process.env.WHOP_COMPANY_ID!;
const APP_URL    = process.env.APP_URL ?? "https://git-hub-publisher.replit.app";

const VALID_PLANS = new Set([
  process.env.WHOP_PLAN_LITE     ?? "plan_sCvQDQK8tMuGz",
  process.env.WHOP_PLAN_EXPLORER ?? "plan_yWK8tkAhYFFHf",
  process.env.WHOP_PLAN_PRO      ?? "plan_b38qgRyEYt5Da",
]);
const DEFAULT_PLAN = process.env.WHOP_PLAN_EXPLORER ?? "plan_yWK8tkAhYFFHf";

// POST /api/whop/checkout
// Creates a Whop checkout session and returns the purchase URL.
// Body: { plan_id?: string }  — falls back to Explorer if omitted or invalid
router.post("/checkout", async (req, res): Promise<void> => {
  const requestedPlan = (req.body as { plan_id?: string }).plan_id ?? "";
  const planId = VALID_PLANS.has(requestedPlan) ? requestedPlan : DEFAULT_PLAN;

  try {
    const client = await getWhopClient();
    const config = await client.checkoutConfigurations.create({
      plan_id: planId,
      redirect_url: `${APP_URL}/api/whop/success`,
    });
    res.json({ purchase_url: config.purchase_url, checkout_id: config.id });
  } catch (err) {
    req.log.error(err, "Whop checkout error");
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/whop/success
// Redirect target after Whop checkout. Looks up membership from checkout config
// and redirects to the activation URL the extension listens for.
router.get("/success", async (req, res): Promise<void> => {
  const checkoutId = req.query.checkout_id as string | undefined;

  if (!checkoutId) {
    res.send("<h2>Payment received! You can close this tab and reopen the extension.</h2>");
    return;
  }

  try {
    // Use REST directly — SDK list doesn't expose checkout_configuration_id filter
    const { getWhopApiKey } = await import("../lib/whopClient");
    const apiKey = await getWhopApiKey();
    const qs = new URLSearchParams({
      company_id: COMPANY_ID,
      "checkout_configuration_ids[]": checkoutId,
      first: "1",
    });
    const r = await fetch(`https://api.whop.com/api/v1/memberships?${qs}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const json = (await r.json()) as { data?: Array<{ id: string }> };
    const membership = json.data?.[0];

    if (membership?.id) {
      // Redirect to the activation URL — background.js listens for this
      res.redirect(
        `https://git-hub-publisher.replit.app/passport-activate?membership_id=${membership.id}`
      );
    } else {
      res.send("<h2>Payment received! Open the extension → Settings and enter your Membership ID from <a href='https://whop.com/dashboard'>whop.com/dashboard</a>.</h2>");
    }
  } catch (err) {
    req.log.error(err, "Whop success lookup error");
    res.send("<h2>Payment received! Open the extension → Settings to restore your access.</h2>");
  }
});

// POST /api/whop/verify
// Verifies whether a Whop membership is active for a given license key (membership ID).
// Body: { membership_id: string }
// Returns: { active: boolean, plan: string }
router.post("/verify", async (req, res): Promise<void> => {
  const { membership_id } = req.body as { membership_id?: string };

  if (!membership_id) {
    res.status(400).json({ error: "membership_id is required" });
    return;
  }

  try {
    const client = await getWhopClient();
    const membership = await client.memberships.retrieve(membership_id);

    const active =
      membership.status === "active" || membership.status === "trialing";

    res.json({
      active,
      status: membership.status,
      plan: membership.plan?.id ?? null,
      expires_at: membership.renewal_period_end ?? null,
    });
  } catch (err) {
    req.log.error(err, "Whop verify error");
    // Treat lookup failure as inactive (not valid)
    res.status(200).json({ active: false, error: (err as Error).message });
  }
});

// GET /api/whop/plan
// Returns public plan info (price, name) so the extension can show it.
router.get("/plan", async (_req, res): Promise<void> => {
  res.json({
    plan_id: DEFAULT_PLAN,
    price: "$12.99 / month",
    name: "Passport Explorer",
    purchase_url: `https://whop.com/checkout/${DEFAULT_PLAN}`,
  });
});

export default router;
