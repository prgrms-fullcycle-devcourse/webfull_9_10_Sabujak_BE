import { z } from "../../../openapi/zod-extend";
import { passwordSchema } from "./shared.dto";

export const verifyPasswordBodySchema = z
  .object({
    password: passwordSchema,
  })
  .openapi("VerifyCapsulePasswordRequest");

export const verifyPasswordResponseSchema = z
  .object({
    verified: z.boolean().openapi({ example: true }),
  })
  .openapi("VerifyCapsulePasswordResponse");
