import { logger } from "../../common/utils/logger";
import { ensureDatabaseConnection } from "../../db";
import {
  CapsuleMessageCountPublisher,
  capsuleMessageCountPublisher,
} from "./capsule-message-count.publisher";
import {
  CapsuleStatsPublisher,
  capsuleStatsPublisher,
} from "./capsule-stats.publisher";
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
  constructor(
    private readonly repository: CapsulesRepository,
    private readonly messageCountPublisher: CapsuleMessageCountPublisher,
    private readonly statsPublisher: CapsuleStatsPublisher,
    private readonly ensureDatabaseReady: () => Promise<void> = () =>
      ensureDatabaseConnection(),
  ) {}

  async createSlugReservation(input: CreateSlugReservationInputDto) {
    return this.withDatabaseReadiness(() =>
      this.repository.createSlugReservation(input),
    );
  }

  async createCapsule(input: CreateCapsuleInputDto) {
    const createdCapsule = await this.withDatabaseReadiness(() =>
      this.repository.createCapsule(input),
    );
    void this.publishCapsuleStatsSafely();
    return createdCapsule;
  }

  async getCapsule(input: GetCapsuleInputDto) {
    return this.withDatabaseReadiness(() => this.repository.getCapsule(input));
  }

  async getCapsuleStats() {
    return this.withDatabaseReadiness(() => this.repository.getCapsuleStats());
  }

  async getMessageCount(input: GetCapsuleInputDto) {
    return this.withDatabaseReadiness(() =>
      this.repository.getMessageCountBySlug(input),
    );
  }

  async verifyCapsulePassword(input: VerifyCapsulePasswordInputDto) {
    return this.withDatabaseReadiness(() =>
      this.repository.verifyCapsulePassword(input),
    );
  }

  async updateCapsule(input: UpdateCapsuleInputDto) {
    return this.withDatabaseReadiness(() =>
      this.repository.updateCapsule(input),
    );
  }

  async deleteCapsule(input: DeleteCapsuleInputDto) {
    await this.withDatabaseReadiness(() =>
      this.repository.deleteCapsule(input),
    );
    // 삭제된 capsule slug 로 유지 중인 SSE 연결도 함께 종료합니다.
    this.messageCountPublisher.closeSlug(input.slug);
    void this.publishCapsuleStatsSafely();
  }

  async createMessage(input: CreateMessageInputDto) {
    const createdMessage = await this.withDatabaseReadiness(() =>
      this.repository.createMessage(input),
    );

    void this.publishLatestMessageCountSafely(input.slug);
    void this.publishCapsuleStatsSafely();

    return createdMessage;
  }

  private async publishLatestMessageCountSafely(slug: string) {
    try {
      const { messageCount } = await this.withDatabaseReadiness(() =>
        this.repository.getMessageCountBySlug({
          slug,
        }),
      );

      this.messageCountPublisher.publish(slug, { messageCount });
    } catch (error) {
      logger.error(
        error,
        "[capsules] Failed to publish messageCount after message create.",
      );
    }
  }

  private async withDatabaseReadiness<T>(task: () => Promise<T>) {
    await this.ensureDatabaseReady();
    return task();
  }

  private async publishCapsuleStatsSafely() {
    try {
      const stats = await this.withDatabaseReadiness(() =>
        this.repository.getCapsuleStats(),
      );
      this.statsPublisher.publish(stats);
    } catch (error) {
      logger.error(error, "[capsules] Failed to publish capsuleStats update.");
    }
  }
}

export const capsulesService = new CapsulesService(
  capsulesRepository,
  capsuleMessageCountPublisher,
  capsuleStatsPublisher,
);
