import {
  CapsuleMessageCountPublisher,
  capsuleMessageCountPublisher,
} from "./capsule-message-count.publisher";
import { capsulesRepository, CapsulesRepository } from "./capsules.repository";
import {
  CreateCapsuleInputDto,
  CreateMessageInputDto,
  CreateSlugReservationInputDto,
  DeleteCapsuleInputDto,
  DeleteMessageInputDto,
  GetCapsuleInputDto,
  UpdateCapsuleInputDto,
  VerifyCapsulePasswordInputDto,
} from "./dto";

export class CapsulesService {
  constructor(
    private readonly repository: CapsulesRepository,
    private readonly messageCountPublisher: CapsuleMessageCountPublisher,
  ) {}

  async createSlugReservation(input: CreateSlugReservationInputDto) {
    return this.repository.createSlugReservation(input);
  }

  async createCapsule(input: CreateCapsuleInputDto) {
    return this.repository.createCapsule(input);
  }

  async getCapsule(input: GetCapsuleInputDto) {
    return this.repository.getCapsule(input);
  }

  async getMessageCount(input: GetCapsuleInputDto) {
    return this.repository.getMessageCountBySlug(input);
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
    const createdMessage = await this.repository.createMessage(input);

    await this.publishLatestMessageCountSafely(input.slug, "create");

    return createdMessage;
  }

  async deleteMessage(input: DeleteMessageInputDto) {
    await this.repository.deleteMessage(input);

    await this.publishLatestMessageCountSafely(input.slug, "delete");
  }

  private async publishLatestMessageCountSafely(
    slug: string,
    action: "create" | "delete",
  ) {
    try {
      const { messageCount } = await this.repository.getMessageCountBySlug({
        slug,
      });

      this.messageCountPublisher.publish(slug, { messageCount });
    } catch (error) {
      console.error(
        `[capsules] Failed to publish messageCount after message ${action}.`,
        error,
      );
    }
  }
}

export const capsulesService = new CapsulesService(
  capsulesRepository,
  capsuleMessageCountPublisher,
);
