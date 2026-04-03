import { CapsulesService } from "./capsules.service";

describe("CapsulesService", () => {
  const flushAsyncTasks = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  const repository = {
    createSlugReservation: jest.fn(),
    createCapsule: jest.fn(),
    getCapsule: jest.fn(),
    getCapsuleStats: jest.fn(),
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
  const statsPublisher = {
    subscribe: jest.fn(),
    publish: jest.fn(),
    clear: jest.fn(),
  };

  const service = new CapsulesService(
    repository as never,
    publisher,
    statsPublisher,
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
    repository.getCapsuleStats.mockResolvedValue({
      totalCapsuleCount: 10,
      totalMessageCount: 44,
    });

    const result = await service.createMessage({
      slug: "opened-capsule",
      nickname: "작성자",
      content: "메시지",
    });
    await flushAsyncTasks();

    expect(result.id).toBe(13);
    expect(repository.createMessage).toHaveBeenCalledWith({
      slug: "opened-capsule",
      nickname: "작성자",
      content: "메시지",
    });
    expect(ensureDatabaseReady).toHaveBeenCalledTimes(3);
    expect(repository.getMessageCountBySlug).toHaveBeenCalledWith({
      slug: "opened-capsule",
    });
    expect(publisher.publish).toHaveBeenCalledWith("opened-capsule", {
      messageCount: 4,
    });
    expect(statsPublisher.publish).toHaveBeenCalledWith({
      totalCapsuleCount: 10,
      totalMessageCount: 44,
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
    await flushAsyncTasks();

    expect(repository.getMessageCountBySlug).not.toHaveBeenCalled();
    expect(publisher.publish).not.toHaveBeenCalled();
    expect(ensureDatabaseReady).toHaveBeenCalledTimes(1);
    expect(statsPublisher.publish).not.toHaveBeenCalled();
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
    repository.getCapsuleStats.mockResolvedValue({
      totalCapsuleCount: 10,
      totalMessageCount: 44,
    });

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
    await flushAsyncTasks();

    expect(publisher.publish).not.toHaveBeenCalled();
    expect(statsPublisher.publish).toHaveBeenCalledWith({
      totalCapsuleCount: 10,
      totalMessageCount: 44,
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(ensureDatabaseReady).toHaveBeenCalledTimes(3);
  });

  it("capsule 삭제 성공 후 해당 slug SSE subscriber를 정리한다", async () => {
    repository.deleteCapsule.mockResolvedValue(undefined);
    repository.getCapsuleStats.mockResolvedValue({
      totalCapsuleCount: 9,
      totalMessageCount: 40,
    });

    await service.deleteCapsule({
      password: "secret123",
      slug: "opened-capsule",
    });
    await flushAsyncTasks();

    expect(repository.deleteCapsule).toHaveBeenCalledWith({
      password: "secret123",
      slug: "opened-capsule",
    });
    expect(publisher.closeSlug).toHaveBeenCalledWith("opened-capsule");
    expect(statsPublisher.publish).toHaveBeenCalledWith({
      totalCapsuleCount: 9,
      totalMessageCount: 40,
    });
    expect(ensureDatabaseReady).toHaveBeenCalledTimes(2);
  });

  it("capsule 생성 성공 후 전역 집계를 publish 한다", async () => {
    repository.createCapsule.mockResolvedValue({
      id: "01TESTCAPSULEID123456789012",
      slug: "new-capsule",
      title: "새 캡슐",
      openAt: "2026-04-03T00:00:00.000Z",
      expiresAt: "2026-04-10T00:00:00.000Z",
      createdAt: "2026-04-03T00:00:00.000Z",
      updatedAt: "2026-04-03T00:00:00.000Z",
    });
    repository.getCapsuleStats.mockResolvedValue({
      totalCapsuleCount: 11,
      totalMessageCount: 44,
    });

    const result = await service.createCapsule({
      slug: "new-capsule",
      title: "새 캡슐",
      password: "1234",
      openAt: "2026-04-03T00:00:00.000Z",
      reservationToken: "token",
    });
    await flushAsyncTasks();

    expect(result.slug).toBe("new-capsule");
    expect(statsPublisher.publish).toHaveBeenCalledWith({
      totalCapsuleCount: 11,
      totalMessageCount: 44,
    });
    expect(ensureDatabaseReady).toHaveBeenCalledTimes(2);
  });

  it("전역 집계 publish 실패가 발생해도 본 요청 응답은 성공시킨다", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    repository.createCapsule.mockResolvedValue({
      id: "01TESTCAPSULEID123456789012",
      slug: "new-capsule",
      title: "새 캡슐",
      openAt: "2026-04-03T00:00:00.000Z",
      expiresAt: "2026-04-10T00:00:00.000Z",
      createdAt: "2026-04-03T00:00:00.000Z",
      updatedAt: "2026-04-03T00:00:00.000Z",
    });
    repository.getCapsuleStats.mockRejectedValue(new Error("stats failed"));

    await expect(
      service.createCapsule({
        slug: "new-capsule",
        title: "새 캡슐",
        password: "1234",
        openAt: "2026-04-03T00:00:00.000Z",
        reservationToken: "token",
      }),
    ).resolves.toEqual({
      id: "01TESTCAPSULEID123456789012",
      slug: "new-capsule",
      title: "새 캡슐",
      openAt: "2026-04-03T00:00:00.000Z",
      expiresAt: "2026-04-10T00:00:00.000Z",
      createdAt: "2026-04-03T00:00:00.000Z",
      updatedAt: "2026-04-03T00:00:00.000Z",
    });
    await flushAsyncTasks();

    expect(statsPublisher.publish).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
