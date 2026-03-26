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
    subscribe: jest.fn(),
    publish: jest.fn(),
  };

  const service = new CapsulesService(repository as never, publisher);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("메시지 생성 성공 후 최신 count를 재조회해 publish 한다", async () => {
    repository.createMessage.mockResolvedValue({
      id: 13,
      nickname: "작성자",
      content: "메시지",
      createdAt: "2026-03-26T00:00:00.000Z",
    });
    repository.getMessageCountBySlug.mockResolvedValue({ messageCount: 4 });

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
  });
});
