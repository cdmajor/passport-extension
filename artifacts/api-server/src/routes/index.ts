import { Router, type IRouter } from "express";
import healthRouter from "./health";
import translateRouter from "./translate";
import proxyRouter from "./proxy";
import whopRouter from "./whop";

const router: IRouter = Router();

router.use(healthRouter);
router.use(translateRouter);
router.use("/proxy", proxyRouter);
router.use("/whop", whopRouter);

export default router;
