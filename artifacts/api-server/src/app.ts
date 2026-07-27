import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// ─── Activation landing page ──────────────────────────────────────────────────
// The extension's webNavigation listener fires on this URL after Whop checkout
// and auto-captures the membership_id from the query string, then closes the tab.
// Must return 200 so the navigation completes — content is shown briefly if
// the tab isn't closed fast enough (e.g. on mobile).
app.get("/passport-activate", (req, res) => {
  const membershipId = req.query.membership_id as string | undefined;
  res.status(200).send(`<!DOCTYPE html><html><head>
    <meta charset="UTF-8"/>
    <title>Passport Activated</title>
    <style>body{font-family:system-ui,sans-serif;background:#0f0f13;color:#f0f0f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:16px}p{color:#888;font-size:14px}</style>
  </head><body>
    <div style="font-size:48px">🛂</div>
    <h2>Passport Activated!</h2>
    <p>You can close this tab and start browsing.</p>
    ${membershipId ? `<p style="font-size:11px;color:#555">Membership: ${membershipId}</p>` : ""}
  </body></html>`);
});

// ─── Checkout redirect ────────────────────────────────────────────────────────
// Direct links to /checkout or /pricing redirect to Whop product page.
const PRODUCT_URL = `https://whop.com/checkout/${process.env.WHOP_PLAN_EXPLORER ?? "plan_yWK8tkAhYFFHf"}`;
app.get(["/checkout", "/pricing"], (_req, res) => {
  res.redirect(302, PRODUCT_URL);
});

export default app;
