import { z } from "../../openapi/zod-extend";
import { errorCodes } from "../exceptions/domain-exception";

export const errorCodeSchema = z.enum(errorCodes);

export const errorDetailSchema = z
  .object({
    field: z
      .string()
      .openapi({
        description: "유효성 검사에 실패한 필드 경로",
        example: "title",
      }),
    message: z
      .string()
      .openapi({
        description: "해당 필드의 검증 실패 메시지",
        example: "최소 1자 이상이어야 합니다.",
      }),
  })
  .openapi("ErrorDetail");

export const errorResponseSchema = z
  .object({
    error: z.object({
      code: errorCodeSchema,
      message: z.string(),
      details: z
        .array(errorDetailSchema)
        .optional()
        .openapi({
          description: "입력값 검증 실패 시 필드별 상세 오류 목록",
          example: [
            {
              field: "title",
              message: "최소 1자 이상이어야 합니다.",
            },
            {
              field: "password",
              message: "4자리 숫자여야 합니다.",
            },
          ],
        }),
    }),
  })
  .openapi("ErrorResponse");
