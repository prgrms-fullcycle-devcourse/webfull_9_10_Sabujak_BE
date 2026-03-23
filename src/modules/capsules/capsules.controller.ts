import { Request, Response } from "express";
import { capsulesService } from "./capsules.service";
import {
  capsuleSlugParamsSchema,
  capsuleDetailResponseSchema,
  createCapsuleBodySchema,
  createCapsuleResponseSchema,
  createMessageBodySchema,
  createMessageResponseSchema,
  createSlugReservationBodySchema,
  deleteCapsuleBodySchema,
  slugReservationResponseSchema,
  updateCapsuleBodySchema,
  updateCapsuleResponseSchema,
  verifyPasswordBodySchema,
  verifyPasswordResponseSchema,
} from "./dto";

// slug 중복 확인 및 5분 예약 토큰 발급
export const createSlugReservation = async (req: Request, res: Response) => {
  const payload = await capsulesService.createSlugReservation(
    createSlugReservationBodySchema.parse(req.body),
  );
  res.status(201).json(slugReservationResponseSchema.parse(payload));
};

// reservationToken 기반 신규 타임캡슐 생성
export const createCapsule = async (req: Request, res: Response) => {
  const payload = await capsulesService.createCapsule(
    createCapsuleBodySchema.parse(req.body),
  );
  res.status(201).json(createCapsuleResponseSchema.parse(payload));
};

// 공개 전후 상태에 따른 캡슐 기본 정보 및 메시지 목록 통합 조회
export const getCapsule = async (req: Request, res: Response) => {
  const payload = await capsulesService.getCapsule(
    capsuleSlugParamsSchema.parse(req.params),
  );
  res.status(200).json(capsuleDetailResponseSchema.parse(payload));
};

// 캡슐 수정 및 삭제 진입 전 관리자 비밀번호 검증
export const verifyCapsulePassword = async (req: Request, res: Response) => {
  const params = capsuleSlugParamsSchema.parse(req.params);
  const body = verifyPasswordBodySchema.parse(req.body);

  res
    .status(200)
    .json(
      verifyPasswordResponseSchema.parse(
        await capsulesService.verifyCapsulePassword({
          ...params,
          ...body,
        }),
      ),
    );
};

// 관리자 비밀번호 검증 이후 캡슐 제목 및 공개 시각 수정
export const updateCapsule = async (req: Request, res: Response) => {
  const params = capsuleSlugParamsSchema.parse(req.params);
  const body = updateCapsuleBodySchema.parse(req.body);
  const payload = await capsulesService.updateCapsule({
    ...params,
    ...body,
  });
  res.status(200).json(updateCapsuleResponseSchema.parse(payload));
};

// 관리자 비밀번호 검증 이후 캡슐 Hard Delete
export const deleteCapsule = async (req: Request, res: Response) => {
  const params = capsuleSlugParamsSchema.parse(req.params);
  const body = deleteCapsuleBodySchema.parse(req.body);

  await capsulesService.deleteCapsule({
    ...params,
    ...body,
  });

  res.status(204).send();
};

// 특정 캡슐 대상 익명 메시지 작성
export const createMessage = async (req: Request, res: Response) => {
  const params = capsuleSlugParamsSchema.parse(req.params);
  const body = createMessageBodySchema.parse(req.body);
  const payload = await capsulesService.createMessage({
    ...params,
    ...body,
  });
  res.status(201).json(createMessageResponseSchema.parse(payload));
};
