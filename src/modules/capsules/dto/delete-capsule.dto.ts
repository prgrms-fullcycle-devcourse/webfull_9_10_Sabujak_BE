import { z } from "../../../openapi/zod-extend";
import { slugSchema } from "./shared.dto";

export const deleteCapsuleResponseSchema = z
  .object({
    deleted: z.literal(true).openapi({ example: true }),
    slug: slugSchema,
  })
  .openapi("DeleteCapsuleResponse");
