import { EventEmitter } from "node:events";
import { InMemoryCapsuleStatsPublisher } from "./capsule-stats.publisher";

class MockSseResponse extends EventEmitter {
  headers = new Map<string, string>();
  writes: string[] = [];
  flushed = false;

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
}

describe("InMemoryCapsuleStatsPublisher", () => {
  let publisher: InMemoryCapsuleStatsPublisher;

  beforeEach(() => {
    jest.useFakeTimers();
    publisher = new InMemoryCapsuleStatsPublisher();
  });

  afterEach(() => {
    publisher.clear();
    jest.useRealTimers();
  });

  it("구독 직후 SSE 헤더와 초기 capsuleStats 이벤트를 전송한다", async () => {
    const response = new MockSseResponse();

    await publisher.subscribe({
      getSnapshot: async () => ({
        totalCapsuleCount: 12,
        totalMessageCount: 77,
      }),
      response: response as never,
    });

    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, no-transform",
    );
    expect(response.flushed).toBe(true);
    expect(response.writes[0]).toContain("event: capsuleStats");
    expect(response.writes[0]).toContain('"totalCapsuleCount":12');
    expect(response.writes[0]).toContain('"totalMessageCount":77');
  });

  it("close 이벤트가 발생하면 subscriber를 정리하고 heartbeat를 중단한다", async () => {
    const response = new MockSseResponse();

    await publisher.subscribe({
      getSnapshot: async () => ({
        totalCapsuleCount: 12,
        totalMessageCount: 77,
      }),
      response: response as never,
    });

    expect(publisher.getSubscriberCount()).toBe(1);

    response.emit("close");
    jest.advanceTimersByTime(25_000);

    expect(publisher.getSubscriberCount()).toBe(0);
    expect(response.writes).toHaveLength(1);
  });

  it("초기 snapshot 조회 중 publish된 최신 payload가 있으면 오래된 snapshot으로 되돌리지 않는다", async () => {
    const response = new MockSseResponse();
    let resolveSnapshot!: (value: {
      totalCapsuleCount: number;
      totalMessageCount: number;
    }) => void;

    const snapshotPromise = new Promise<{
      totalCapsuleCount: number;
      totalMessageCount: number;
    }>((resolve) => {
      resolveSnapshot = resolve;
    });

    const subscribePromise = publisher.subscribe({
      getSnapshot: () => snapshotPromise,
      response: response as never,
    });

    publisher.publish({
      totalCapsuleCount: 13,
      totalMessageCount: 78,
    });

    resolveSnapshot({
      totalCapsuleCount: 12,
      totalMessageCount: 77,
    });
    await subscribePromise;

    expect(response.writes).toHaveLength(1);
    expect(response.writes[0]).toContain('"totalCapsuleCount":13');
    expect(response.writes[0]).toContain('"totalMessageCount":78');
  });
});
