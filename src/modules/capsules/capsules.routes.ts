import { Router } from "express";
import {
  createCapsule,
  createMessage,
  createSlugReservation,
  deleteCapsule,
  getCapsule,
  streamCapsuleMessageCount,
  updateCapsule,
  verifyCapsulePassword,
} from "./capsules.controller";

const router = Router();

router.post("/capsules/slug-reservations", createSlugReservation);
router.post("/capsules", createCapsule);
router.get("/capsules/:slug", getCapsule);
router.get("/capsules/:slug/message-count/stream", streamCapsuleMessageCount);
router.post("/capsules/:slug/verify", verifyCapsulePassword);
router.patch("/capsules/:slug", updateCapsule);
router.delete("/capsules/:slug", deleteCapsule);
router.post("/capsules/:slug/messages", createMessage);

export default router;
