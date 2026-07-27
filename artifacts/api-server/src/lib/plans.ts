// Passport tier definitions
// Sessions are the unit of proxy use we can measure server-side.
// Estimated bandwidth: 1 session ≈ 50 MB (30-min browsing window)
// So: 1 GB ≈ 20 sessions

export interface PlanConfig {
  id: string;
  name: "Lite" | "Explorer" | "Pro";
  gbLimit: number;
  sessionsLimit: number; // gbLimit × 20
  price: number;
  warningThreshold: number; // fraction — 0.8 = 80%
}

export const PLANS: Record<string, PlanConfig> = {
  [process.env.WHOP_PLAN_LITE ?? "plan_sCvQDQK8tMuGz"]: {
    id: process.env.WHOP_PLAN_LITE ?? "plan_sCvQDQK8tMuGz",
    name: "Lite",
    gbLimit: 3,
    sessionsLimit: 60,
    price: 4.99,
    warningThreshold: 0.8,
  },
  [process.env.WHOP_PLAN_EXPLORER ?? "plan_yWK8tkAhYFFHf"]: {
    id: process.env.WHOP_PLAN_EXPLORER ?? "plan_yWK8tkAhYFFHf",
    name: "Explorer",
    gbLimit: 10,
    sessionsLimit: 200,
    price: 12.99,
    warningThreshold: 0.8,
  },
  [process.env.WHOP_PLAN_PRO ?? "plan_b38qgRyEYt5Da"]: {
    id: process.env.WHOP_PLAN_PRO ?? "plan_b38qgRyEYt5Da",
    name: "Pro",
    gbLimit: 30,
    sessionsLimit: 600,
    price: 34.99,
    warningThreshold: 0.8,
  },
};

export const PLAN_IDS = {
  LITE:     process.env.WHOP_PLAN_LITE     ?? "plan_sCvQDQK8tMuGz",
  EXPLORER: process.env.WHOP_PLAN_EXPLORER ?? "plan_yWK8tkAhYFFHf",
  PRO:      process.env.WHOP_PLAN_PRO      ?? "plan_b38qgRyEYt5Da",
};

export const CHECKOUT_URLS: Record<string, string> = {
  Lite:     `https://whop.com/checkout/${PLAN_IDS.LITE}`,
  Explorer: `https://whop.com/checkout/${PLAN_IDS.EXPLORER}`,
  Pro:      `https://whop.com/checkout/${PLAN_IDS.PRO}`,
};
