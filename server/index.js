import express from "express";
import cors from "cors";
import proxyRouter from "./routes/proxy.js";
import translateRouter from "./routes/translate.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "*" })); // Extension can call from any tab origin
app.use(express.json());

app.use("/api/proxy", proxyRouter);
app.use("/api", translateRouter);

function healthPayload() {
  return {
    service: "Passport API",
    status: "ok",
    features: {
      proxy: true,
      translation: true,
    },
  };
}

app.get("/", (_req, res) => res.json(healthPayload()));
app.get("/api/health", (_req, res) => res.json(healthPayload()));

app.listen(PORT, () => console.log(`Passport API listening on port ${PORT}`));
