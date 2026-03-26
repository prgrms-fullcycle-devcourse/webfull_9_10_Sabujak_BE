import { z } from "../../../openapi/zod-extend";
import { createCapsuleBodySchema } from "./create-capsule.dto";
import { createMessageBodySchema } from "./create-message.dto";
import {
  capsuleMessageParamsSchema,
  capsuleSlugParamsSchema,
} from "./shared.dto";
import { createSlugReservationBodySchema } from "./slug-reservation.dto";
import { updateCapsuleBodySchema } from "./update-capsule.dto";
import { verifyPasswordBodySchema } from "./verify-capsule-password.dto";
import { deleteCapsuleBodySchema } from "./delete-capsule.dto";
import { deleteMessageBodySchema } from "./delete-message.dto";

type CapsuleSlugParamsDto = z.infer<typeof capsuleSlugParamsSchema>;
type CapsuleMessageParamsDto = z.infer<typeof capsuleMessageParamsSchema>;

export type CreateSlugReservationInputDto = z.infer<
  typeof createSlugReservationBodySchema
>;

export type CreateCapsuleInputDto = z.infer<typeof createCapsuleBodySchema>;

export type GetCapsuleInputDto = CapsuleSlugParamsDto;

export type VerifyCapsulePasswordInputDto = CapsuleSlugParamsDto &
  z.infer<typeof verifyPasswordBodySchema>;

export type UpdateCapsuleInputDto = CapsuleSlugParamsDto &
  z.infer<typeof updateCapsuleBodySchema>;

export type DeleteCapsuleInputDto = CapsuleSlugParamsDto &
  z.infer<typeof deleteCapsuleBodySchema>;

export type CreateMessageInputDto = CapsuleSlugParamsDto &
  z.infer<typeof createMessageBodySchema>;

export type DeleteMessageInputDto = CapsuleMessageParamsDto &
  z.infer<typeof deleteMessageBodySchema>;
