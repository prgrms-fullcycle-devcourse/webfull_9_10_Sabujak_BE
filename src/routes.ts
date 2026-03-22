import { Router } from "express";
import capsulesRouter from "./modules/capsules/capsules.routes";
import systemRouter from "./modules/system/system.routes";

const router = Router();

router.use("/", systemRouter);
router.use("/", capsulesRouter);

export default router;
