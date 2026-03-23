import { z } from "../../openapi/zod-extend";
import { errorCodes } from "../exceptions/domain-exception";

export const errorCodeSchema = z.enum(errorCodes);

export const errorResponseSchema = z
  .object({
    error: z.object({
      code: errorCodeSchema,
      message: z.string(),
    }),
  })
  .openapi("ErrorResponse");
