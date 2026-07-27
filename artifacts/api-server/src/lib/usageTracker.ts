// Proxy usage tracker — counts sessions per membership per billing month.
// 1 session ≈ 50 MB (30-min proxy window). 1 GB ≈ 20 sessions.

import { db } from "../db";
import { proxyUsage } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { type PlanConfig } from "./plans";

export interface UsageRecord {
  sessionsUsed:  number;
  sessionsLimit: number;
  gbEstimate:    number;
  gbLimit:       number;
  percentUsed:   number;
  tier:          string;
  atLimit:       boolean;
  nearLimit:     boolean;   // ≥ 80%
  justHit80:     boolean;   // true only on the session that crossed 80%
  upgradeUrl:    string;
}

function billingMonth(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

export async function recordSession(
  membershipId: string,
  plan: PlanConfig
): Promise<UsageRecord> {
  const month = billingMonth();

  // Upsert row then increment atomically
  await db
    .insert(proxyUsage)
    .values({ membershipId, billingMonth: month, sessions: 1 })
    .onConflictDoUpdate({
      target: [proxyUsage.membershipId, proxyUsage.billingMonth],
      set: {
        sessions:  sql`${proxyUsage.sessions} + 1`,
        updatedAt: sql`NOW()`,
      },
    });

  // Fetch updated row
  const rows = await db
    .select()
    .from(proxyUsage)
    .where(
      and(
        eq(proxyUsage.membershipId, membershipId),
        eq(proxyUsage.billingMonth, month)
      )
    )
    .limit(1);

  const row       = rows[0]!;
  const sessions  = row.sessions;
  const pct       = sessions / plan.sessionsLimit;
  const nearLimit = pct >= plan.warningThreshold;
  const atLimit   = sessions >= plan.sessionsLimit;
  const justHit80 = nearLimit && !row.warnedAt80 && !atLimit;

  // Mark 80% warning as sent (idempotent)
  if (justHit80) {
    await db
      .update(proxyUsage)
      .set({ warnedAt80: true, updatedAt: new Date() })
      .where(
        and(
          eq(proxyUsage.membershipId, membershipId),
          eq(proxyUsage.billingMonth, month)
        )
      );
  }

  return buildRecord(sessions, row.warnedAt80 || justHit80, plan, justHit80);
}

export async function getUsage(
  membershipId: string,
  plan: PlanConfig
): Promise<UsageRecord> {
  const month = billingMonth();
  const rows = await db
    .select()
    .from(proxyUsage)
    .where(
      and(
        eq(proxyUsage.membershipId, membershipId),
        eq(proxyUsage.billingMonth, month)
      )
    )
    .limit(1);

  const sessions = rows[0]?.sessions ?? 0;
  return buildRecord(sessions, rows[0]?.warnedAt80 ?? false, plan, false);
}

function buildRecord(
  sessions:   number,
  warnedAt80: boolean,
  plan:       PlanConfig,
  justHit80:  boolean
): UsageRecord {
  const pct = sessions / plan.sessionsLimit;
  return {
    sessionsUsed:  sessions,
    sessionsLimit: plan.sessionsLimit,
    gbEstimate:    parseFloat((sessions / 20).toFixed(2)),
    gbLimit:       plan.gbLimit,
    percentUsed:   Math.min(100, Math.round(pct * 100)),
    tier:          plan.name,
    atLimit:       sessions >= plan.sessionsLimit,
    nearLimit:     pct >= plan.warningThreshold,
    justHit80,
    upgradeUrl:    getUpgradeUrl(plan.name),
  };
}

function getUpgradeUrl(currentTier: string): string {
  const EXPLORER_ID = process.env.WHOP_PLAN_EXPLORER ?? "plan_yWK8tkAhYFFHf";
  const PRO_ID      = process.env.WHOP_PLAN_PRO      ?? "plan_b38qgRyEYt5Da";
  if (currentTier === "Lite")     return `https://whop.com/checkout/${EXPLORER_ID}`;
  if (currentTier === "Explorer") return `https://whop.com/checkout/${PRO_ID}`;
  return `https://whop.com/checkout/${PRO_ID}`;
}
