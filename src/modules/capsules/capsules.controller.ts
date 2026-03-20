import { Request, Response } from "express";
import { capsulesService } from "./capsules.service";
import {
  capsuleDetailResponseSchema,
  createCapsuleResponseSchema,
  createMessageResponseSchema,
  deleteCapsuleResponseSchema,
  slugReservationResponseSchema,
  updateCapsuleResponseSchema,
  verifyPasswordResponseSchema,
} from "./dto";

const getSlugParam = (slug: string | string[] | undefined) =>
  Array.isArray(slug) ? slug[0] : slug;

// slug 중복 확인 및 5분 예약 토큰 발급
export const createSlugReservation = (req: Request, res: Response) => {
  const payload = capsulesService.createSlugReservation(req.body?.slug);
  res.status(201).json(slugReservationResponseSchema.parse(payload));
};

// reservationToken 기반 신규 타임캡슐 생성
export const createCapsule = (req: Request, res: Response) => {
  const payload = capsulesService.createCapsule({
    slug: req.body?.slug,
    title: req.body?.title,
    openAt: req.body?.openAt,
  });
  res.status(201).json(createCapsuleResponseSchema.parse(payload));
};

// 공개 전후 상태에 따른 캡슐 기본 정보 및 메시지 목록 통합 조회
export const getCapsule = (req: Request, res: Response) => {
  const payload = capsulesService.getCapsule(
    getSlugParam(req.params.slug) ?? "",
  );
  res.status(200).json(capsuleDetailResponseSchema.parse(payload));
};

// 캡슐 수정 및 삭제 진입 전 관리자 비밀번호 검증
export const verifyCapsulePassword = (req: Request, res: Response) => {
  res
    .status(200)
    .json(
      verifyPasswordResponseSchema.parse(
        capsulesService.verifyCapsulePassword(),
      ),
    );
};

// 관리자 비밀번호 검증 이후 캡슐 제목 및 공개 시각 수정
export const updateCapsule = (req: Request, res: Response) => {
  const payload = capsulesService.updateCapsule({
    slug: getSlugParam(req.params.slug),
    title: req.body?.title,
    openAt: req.body?.openAt,
  });
  res.status(200).json(updateCapsuleResponseSchema.parse(payload));
};

// 관리자 비밀번호 검증 이후 캡슐 Hard Delete
export const deleteCapsule = (req: Request, res: Response) => {
  const payload = capsulesService.deleteCapsule(getSlugParam(req.params.slug));
  res.status(200).json(deleteCapsuleResponseSchema.parse(payload));
};

// 특정 캡슐 대상 익명 메시지 작성
export const createMessage = (req: Request, res: Response) => {
  const payload = capsulesService.createMessage({
    nickname: req.body?.nickname,
    content: req.body?.content,
  });
  res.status(201).json(createMessageResponseSchema.parse(payload));
};
