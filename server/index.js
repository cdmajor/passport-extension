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

app.get("/", (_req, res) => res.json({ service: "Passport API", status: "ok" }));

app.listen(PORT, () => console.log(`Passport API listening on port ${PORT}`));
