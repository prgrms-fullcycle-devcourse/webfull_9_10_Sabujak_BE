import {
  buildCapsuleBaseMock,
  buildCapsuleDetailMock,
  buildDeleteCapsuleMock,
  buildMessageMock,
  buildSlugReservationMock,
  buildVerifyPasswordMock,
} from "../../mocks/capsule.mock";
import { CapsuleMutationDto, MessageInputDto } from "./dto";

export class CapsulesRepository {
  createSlugReservation(slug?: unknown) {
    return buildSlugReservationMock(slug);
  }

  createCapsule(input: CapsuleMutationDto) {
    return buildCapsuleBaseMock(input);
  }

  getCapsule(slug: string) {
    return buildCapsuleDetailMock(slug);
  }

  verifyCapsulePassword() {
    return buildVerifyPasswordMock();
  }

  updateCapsule(input: CapsuleMutationDto) {
    return buildCapsuleBaseMock(input);
  }

  deleteCapsule(slug?: unknown) {
    return buildDeleteCapsuleMock(slug);
  }

  createMessage(input: MessageInputDto) {
    return buildMessageMock(input);
  }
}

export const capsulesRepository = new CapsulesRepository();
