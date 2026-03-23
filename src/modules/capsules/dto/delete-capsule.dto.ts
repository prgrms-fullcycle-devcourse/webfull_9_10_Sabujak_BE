import { z } from "../../../openapi/zod-extend";
import { passwordSchema } from "./shared.dto";

export const deleteCapsuleBodySchema = z
  .object({
    password: passwordSchema,
  })
  .openapi("DeleteCapsuleRequest");
