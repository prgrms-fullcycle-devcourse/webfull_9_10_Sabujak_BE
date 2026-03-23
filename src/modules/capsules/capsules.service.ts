import { capsulesRepository, CapsulesRepository } from "./capsules.repository";
import {
  CreateCapsuleInputDto,
  CreateMessageInputDto,
  CreateSlugReservationInputDto,
  DeleteCapsuleInputDto,
  GetCapsuleInputDto,
  UpdateCapsuleInputDto,
  VerifyCapsulePasswordInputDto,
} from "./dto";

export class CapsulesService {
  constructor(private readonly repository: CapsulesRepository) {}

  async createSlugReservation(input: CreateSlugReservationInputDto) {
    return this.repository.createSlugReservation(input);
  }

  async createCapsule(input: CreateCapsuleInputDto) {
    return this.repository.createCapsule(input);
  }

  async getCapsule(input: GetCapsuleInputDto) {
    return this.repository.getCapsule(input);
  }

  async verifyCapsulePassword(input: VerifyCapsulePasswordInputDto) {
    return this.repository.verifyCapsulePassword(input);
  }

  async updateCapsule(input: UpdateCapsuleInputDto) {
    return this.repository.updateCapsule(input);
  }

  async deleteCapsule(input: DeleteCapsuleInputDto) {
    return this.repository.deleteCapsule(input);
  }

  async createMessage(input: CreateMessageInputDto) {
    return this.repository.createMessage(input);
  }
}

export const capsulesService = new CapsulesService(capsulesRepository);
