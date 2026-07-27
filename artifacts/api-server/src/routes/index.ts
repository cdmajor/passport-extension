import { Router, type IRouter } from "express";
import healthRouter from "./health";
import translateRouter from "./translate";
import proxyRouter from "./proxy";
import whopRouter from "./whop";
import usageRouter from "./usage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(translateRouter);
router.use("/proxy", proxyRouter);
router.use("/whop", whopRouter);
router.use("/usage", usageRouter);

export default router;
