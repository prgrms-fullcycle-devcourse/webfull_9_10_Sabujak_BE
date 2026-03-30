import { EventEmitter } from "node:events";
import { InMemoryCapsuleMessageCountPublisher } from "./capsule-message-count.publisher";

class MockSseResponse extends EventEmitter {
  ended = false;
  headers = new Map<string, string>();
  writes: string[] = [];
  flushed = false;
  writableEnded = false;

  setHeader(name: string, value: string) {
    this.headers.set(name, value);
  }

  flushHeaders() {
    this.flushed = true;
  }

  write(chunk: string) {
    this.writes.push(chunk);
    return true;
  }

  end() {
    this.ended = true;
    this.writableEnded = true;
    return this;
  }
}

describe("InMemoryCapsuleMessageCountPublisher", () => {
  let publisher: InMemoryCapsuleMessageCountPublisher;
  const futureExpiresAt = "2026-03-31T00:00:00.000Z";

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-30T00:00:00.000Z"));
    publisher = new InMemoryCapsuleMessageCountPublisher();
  });

  afterEach(() => {
    publisher.clear();
    jest.useRealTimers();
  });

  it("구독 직후 SSE 헤더와 초기 messageCount 이벤트를 전송한다", async () => {
    const response = new MockSseResponse();

    await publisher.subscribe({
      getSnapshot: async () => ({
        expiresAt: futureExpiresAt,
        messageCount: 3,
      }),
      slug: "opened-capsule",
      response: response as never,
    });

    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, no-transform",
    );
    expect(response.headers.get("Connection")).toBe("keep-alive");
    expect(response.flushed).toBe(true);
    expect(response.writes[0]).toContain("event: messageCount");
    expect(response.writes[0]).toContain('"messageCount":3');
  });

  it("publish 호출 시 같은 slug 구독자에게 새 count를 전송한다", async () => {
    const response = new MockSseResponse();

    await publisher.subscribe({
      getSnapshot: async () => ({
        expiresAt: futureExpiresAt,
        messageCount: 1,
      }),
      slug: "opened-capsule",
      response: response as never,
    });

    publisher.publish("opened-capsule", { messageCount: 2 });

    expect(response.writes[1]).toContain('"messageCount":2');
  });

  it("더 작은 count가 늦게 들어오면 역전 이벤트를 전송하지 않는다", async () => {
    const response = new MockSseResponse();

    await publisher.subscribe({
      getSnapshot: async () => ({
        expiresAt: futureExpiresAt,
        messageCount: 1,
      }),
      slug: "opened-capsule",
      response: response as never,
    });

    publisher.publish("opened-capsule", { messageCount: 3 });
    publisher.publish("opened-capsule", { messageCount: 2 });

    expect(response.writes).toHaveLength(2);
    expect(response.writes[1]).toContain('"messageCount":3');
  });

  it("같은 count가 다시 publish 되면 중복 이벤트를 전송하지 않는다", async () => {
    const response = new MockSseResponse();

    await publisher.subscribe({
      getSnapshot: async () => ({
        expiresAt: futureExpiresAt,
        messageCount: 1,
      }),
      slug: "opened-capsule",
      response: response as never,
    });

    publisher.publish("opened-capsule", { messageCount: 3 });
    publisher.publish("opened-capsule", { messageCount: 3 });

    expect(response.writes).toHaveLength(2);
    expect(response.writes[1]).toContain('"messageCount":3');
  });

  it("close 이벤트가 발생하면 subscriber를 정리한다", async () => {
    const response = new MockSseResponse();

    await publisher.subscribe({
      getSnapshot: async () => ({
        expiresAt: futureExpiresAt,
        messageCount: 1,
      }),
      slug: "opened-capsule",
      response: response as never,
    });

    expect(publisher.getSubscriberCount("opened-capsule")).toBe(1);

    response.emit("close");

    expect(publisher.getSubscriberCount("opened-capsule")).toBe(0);
  });

  it("heartbeat를 주기적으로 전송한다", async () => {
    const response = new MockSseResponse();

    await publisher.subscribe({
      getSnapshot: async () => ({
        expiresAt: futureExpiresAt,
        messageCount: 1,
      }),
      slug: "opened-capsule",
      response: response as never,
    });

    jest.advanceTimersByTime(25_000);

    expect(response.writes[1]).toBe(": keep-alive\n\n");
  });

  it("새 subscriber 등록 직전 publish 된 더 큰 count보다 작은 초기값을 내리지 않는다", async () => {
    const response = new MockSseResponse();
    let resolveSnapshot!: (value: {
      expiresAt: string;
      messageCount: number;
    }) => void;
    const snapshotPromise = new Promise<{
      expiresAt: string;
      messageCount: number;
    }>((resolve) => {
      resolveSnapshot = resolve;
    });

    const subscribePromise = publisher.subscribe({
      getSnapshot: () => snapshotPromise,
      slug: "opened-capsule",
      response: response as never,
    });

    publisher.publish("opened-capsule", { messageCount: 4 });
    resolveSnapshot({ expiresAt: futureExpiresAt, messageCount: 3 });
    await subscribePromise;

    expect(response.writes).toHaveLength(1);
    expect(response.writes[0]).toContain('"messageCount":4');
  });

  it("이미 더 큰 count가 전달된 채널에 새 subscriber가 붙어도 count 역전이 없다", async () => {
    const firstResponse = new MockSseResponse();
    const secondResponse = new MockSseResponse();

    await publisher.subscribe({
      getSnapshot: async () => ({
        expiresAt: futureExpiresAt,
        messageCount: 1,
      }),
      slug: "opened-capsule",
      response: firstResponse as never,
    });

    publisher.publish("opened-capsule", { messageCount: 5 });

    await publisher.subscribe({
      getSnapshot: async () => ({
        expiresAt: futureExpiresAt,
        messageCount: 2,
      }),
      slug: "opened-capsule",
      response: secondResponse as never,
    });

    expect(secondResponse.writes).toHaveLength(1);
    expect(secondResponse.writes[0]).toContain('"messageCount":5');
  });

  it("capsule 삭제 시 기존 SSE subscriber들을 정리하고 연결을 종료한다", async () => {
    const firstResponse = new MockSseResponse();
    const secondResponse = new MockSseResponse();

    await publisher.subscribe({
      getSnapshot: async () => ({
        expiresAt: futureExpiresAt,
        messageCount: 1,
      }),
      slug: "opened-capsule",
      response: firstResponse as never,
    });
    await publisher.subscribe({
      getSnapshot: async () => ({
        expiresAt: futureExpiresAt,
        messageCount: 1,
      }),
      slug: "opened-capsule",
      response: secondResponse as never,
    });

    publisher.closeSlug("opened-capsule");

    expect(publisher.getSubscriberCount("opened-capsule")).toBe(0);
    expect(firstResponse.ended).toBe(true);
    expect(secondResponse.ended).toBe(true);
  });

  it("capsule 만료 시 SSE subscriber를 정리하고 연결을 종료한다", async () => {
    const response = new MockSseResponse();

    await publisher.subscribe({
      getSnapshot: async () => ({
        expiresAt: "2026-03-30T00:00:05.000Z",
        messageCount: 1,
      }),
      slug: "opened-capsule",
      response: response as never,
    });

    jest.advanceTimersByTime(5_000);

    expect(publisher.getSubscriberCount("opened-capsule")).toBe(0);
    expect(response.ended).toBe(true);
  });

  it("초기 snapshot 조회가 실패하면 헤더를 열지 않고 subscriber를 정리한다", async () => {
    const response = new MockSseResponse();

    await expect(
      publisher.subscribe({
        getSnapshot: async () => {
          throw new Error("snapshot failed");
        },
        slug: "opened-capsule",
        response: response as never,
      }),
    ).rejects.toThrow("snapshot failed");

    expect(response.flushed).toBe(false);
    expect(response.headers.size).toBe(0);
    expect(publisher.getSubscriberCount("opened-capsule")).toBe(0);
  });
});
