import { CapsulesService } from "./capsules.service";

describe("CapsulesService", () => {
  const repository = {
    createSlugReservation: jest.fn(),
    createCapsule: jest.fn(),
    getCapsule: jest.fn(),
    getMessageCountBySlug: jest.fn(),
    verifyCapsulePassword: jest.fn(),
    updateCapsule: jest.fn(),
    deleteCapsule: jest.fn(),
    createMessage: jest.fn(),
  };

  const publisher = {
    closeSlug: jest.fn(),
    subscribe: jest.fn(),
    publish: jest.fn(),
  };

  const ensureDatabaseReady = jest.fn().mockResolvedValue(undefined);
  const service = new CapsulesService(
    repository as never,
    publisher,
    ensureDatabaseReady,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    ensureDatabaseReady.mockResolvedValue(undefined);
  });

  it("메시지 생성 성공 후 최신 count를 재조회해 publish 한다", async () => {
    repository.createMessage.mockResolvedValue({
      id: 13,
      nickname: "작성자",
      content: "메시지",
      createdAt: "2026-03-26T00:00:00.000Z",
    });
    repository.getMessageCountBySlug.mockResolvedValue({
      expiresAt: "2099-01-01T00:00:00.000Z",
      messageCount: 4,
    });

    const result = await service.createMessage({
      slug: "opened-capsule",
      nickname: "작성자",
      content: "메시지",
    });

    expect(result.id).toBe(13);
    expect(repository.createMessage).toHaveBeenCalledWith({
      slug: "opened-capsule",
      nickname: "작성자",
      content: "메시지",
    });
    expect(ensureDatabaseReady).toHaveBeenCalledTimes(2);
    expect(repository.getMessageCountBySlug).toHaveBeenCalledWith({
      slug: "opened-capsule",
    });
    expect(publisher.publish).toHaveBeenCalledWith("opened-capsule", {
      messageCount: 4,
    });
  });

  it("메시지 생성이 실패하면 publish를 호출하지 않는다", async () => {
    repository.createMessage.mockRejectedValue(new Error("insert failed"));

    await expect(
      service.createMessage({
        slug: "opened-capsule",
        nickname: "작성자",
        content: "메시지",
      }),
    ).rejects.toThrow("insert failed");

    expect(repository.getMessageCountBySlug).not.toHaveBeenCalled();
    expect(publisher.publish).not.toHaveBeenCalled();
    expect(ensureDatabaseReady).toHaveBeenCalledTimes(1);
  });

  it("publish 단계가 실패해도 메시지 생성 자체는 성공시킨다", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    repository.createMessage.mockResolvedValue({
      id: 13,
      nickname: "작성자",
      content: "메시지",
      createdAt: "2026-03-26T00:00:00.000Z",
    });
    repository.getMessageCountBySlug.mockRejectedValue(
      new Error("count query failed"),
    );

    await expect(
      service.createMessage({
        slug: "opened-capsule",
        nickname: "작성자",
        content: "메시지",
      }),
    ).resolves.toEqual({
      id: 13,
      nickname: "작성자",
      content: "메시지",
      createdAt: "2026-03-26T00:00:00.000Z",
    });

    expect(publisher.publish).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(ensureDatabaseReady).toHaveBeenCalledTimes(2);
  });

  it("capsule 삭제 성공 후 해당 slug SSE subscriber를 정리한다", async () => {
    repository.deleteCapsule.mockResolvedValue(undefined);

    await service.deleteCapsule({
      password: "secret123",
      slug: "opened-capsule",
    });

    expect(repository.deleteCapsule).toHaveBeenCalledWith({
      password: "secret123",
      slug: "opened-capsule",
    });
    expect(publisher.closeSlug).toHaveBeenCalledWith("opened-capsule");
    expect(ensureDatabaseReady).toHaveBeenCalledTimes(1);
  });
});
