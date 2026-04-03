import { Router } from "express";
import {
  createCapsule,
  createMessage,
  createSlugReservation,
  deleteCapsule,
  getCapsule,
  getCapsuleStats,
  streamCapsuleMessageCount,
  streamCapsuleStats,
  updateCapsule,
  verifyCapsulePassword,
} from "./capsules.controller";

const router = Router();

router.post("/capsules/slug-reservations", createSlugReservation);
router.post("/capsules", createCapsule);
router.get("/capsules/stats", getCapsuleStats);
router.get("/capsules/stats/stream", streamCapsuleStats);
router.get("/capsules/:slug", getCapsule);
router.get("/capsules/:slug/message-count/stream", streamCapsuleMessageCount);
router.post("/capsules/:slug/verify", verifyCapsulePassword);
router.patch("/capsules/:slug", updateCapsule);
router.delete("/capsules/:slug", deleteCapsule);
router.post("/capsules/:slug/messages", createMessage);

export default router;
