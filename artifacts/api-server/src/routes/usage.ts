// GET /api/usage — returns current month's proxy usage for a membership
import { Router } from "express";
import { getWhopClient } from "../lib/whopClient";
import { getUsage } from "../lib/usageTracker";
import { PLANS } from "../lib/plans";

const router = Router();

router.get("/", async (req, res): Promise<void> => {
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

    const planId = membership.plan?.id ?? "";
    const plan = PLANS[planId];
    if (!plan) {
      res.status(400).json({ error: "Unknown plan" });
      return;
    }

    const usage = await getUsage(membershipId, plan);
    res.json(usage);
  } catch (err) {
    const msg = (err as Error).message ?? "";
    // Whop throws on unknown membership IDs — surface as 404, not 500
    const status = msg.includes("not found") || msg.includes("404") ? 404 : 500;
    req.log.error(err, "Usage fetch error");
    res.status(status).json({ error: status === 404 ? "Membership not found" : msg });
  }
});

export default router;
