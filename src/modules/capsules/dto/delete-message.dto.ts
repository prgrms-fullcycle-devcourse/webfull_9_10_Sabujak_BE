import { z } from "../../../openapi/zod-extend";
import { passwordSchema } from "./shared.dto";

export const deleteMessageBodySchema = z
  .object({
    password: passwordSchema,
  })
  .openapi("DeleteMessageRequest");
