import {
  buildCapsuleBaseMock,
  buildCapsuleDetailMock,
  buildMessageMock,
  buildSlugReservationMock,
  buildVerifyPasswordMock,
} from "../../mocks/capsule.mock";
import {
  CreateCapsuleInputDto,
  CreateMessageInputDto,
  CreateSlugReservationInputDto,
  DeleteCapsuleInputDto,
  GetCapsuleInputDto,
  UpdateCapsuleInputDto,
  VerifyCapsulePasswordInputDto,
} from "./dto";

export class CapsulesRepository {
  async createSlugReservation(input: CreateSlugReservationInputDto) {
    return buildSlugReservationMock(input.slug);
  }

  async createCapsule(input: CreateCapsuleInputDto) {
    return buildCapsuleBaseMock(input);
  }

  async getCapsule(input: GetCapsuleInputDto) {
    return buildCapsuleDetailMock(input.slug);
  }

  async verifyCapsulePassword(input: VerifyCapsulePasswordInputDto) {
    void input;
    return buildVerifyPasswordMock();
  }

  async updateCapsule(input: UpdateCapsuleInputDto) {
    return buildCapsuleBaseMock(input);
  }

  async deleteCapsule(input: DeleteCapsuleInputDto) {
    void input;
    return;
  }

  async createMessage(input: CreateMessageInputDto) {
    return buildMessageMock(input);
  }
}

export const capsulesRepository = new CapsulesRepository();
