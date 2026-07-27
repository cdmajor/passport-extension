import { Router, type IRouter } from "express";
import healthRouter from "./health";
import translateRouter from "./translate";
import proxyRouter from "./proxy";

const router: IRouter = Router();

router.use(healthRouter);
router.use(translateRouter);
router.use("/proxy", proxyRouter);

export default router;
