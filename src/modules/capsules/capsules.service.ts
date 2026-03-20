import { capsulesRepository, CapsulesRepository } from "./capsules.repository";
import { CapsuleMutationDto, MessageInputDto } from "./dto";

export class CapsulesService {
  constructor(private readonly repository: CapsulesRepository) {}

  createSlugReservation(slug?: unknown) {
    return this.repository.createSlugReservation(slug);
  }

  createCapsule(input: CapsuleMutationDto) {
    return this.repository.createCapsule(input);
  }

  getCapsule(slug: string) {
    return this.repository.getCapsule(slug);
  }

  verifyCapsulePassword() {
    return this.repository.verifyCapsulePassword();
  }

  updateCapsule(input: CapsuleMutationDto) {
    return this.repository.updateCapsule(input);
  }

  deleteCapsule(slug?: unknown) {
    return this.repository.deleteCapsule(slug);
  }

  createMessage(input: MessageInputDto) {
    return this.repository.createMessage(input);
  }
}

export const capsulesService = new CapsulesService(capsulesRepository);
