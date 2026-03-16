import { Router } from "express";
import { helloWorld, healthCheck } from "./app.controller";

const router = Router();

router.get("/", helloWorld);
router.get("/healthCheck", healthCheck);

export default router;
