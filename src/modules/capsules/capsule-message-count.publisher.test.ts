import { EventEmitter } from "node:events";
import { InMemoryCapsuleMessageCountPublisher } from "./capsule-message-count.publisher";

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

describe("InMemoryCapsuleMessageCountPublisher", () => {
  let publisher: InMemoryCapsuleMessageCountPublisher;

  beforeEach(() => {
    jest.useFakeTimers();
    publisher = new InMemoryCapsuleMessageCountPublisher();
  });

  afterEach(() => {
    publisher.clear();
    jest.useRealTimers();
  });

  it("구독 직후 SSE 헤더와 초기 messageCount 이벤트를 전송한다", () => {
    const response = new MockSseResponse();

    publisher.subscribe({
      slug: "opened-capsule",
      response: response as never,
      initialMessageCount: 3,
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

  it("publish 호출 시 같은 slug 구독자에게 새 count를 전송한다", () => {
    const response = new MockSseResponse();

    publisher.subscribe({
      slug: "opened-capsule",
      response: response as never,
      initialMessageCount: 1,
    });

    publisher.publish("opened-capsule", { messageCount: 2 });

    expect(response.writes[1]).toContain('"messageCount":2');
  });

  it("close 이벤트가 발생하면 subscriber를 정리한다", () => {
    const response = new MockSseResponse();

    publisher.subscribe({
      slug: "opened-capsule",
      response: response as never,
      initialMessageCount: 1,
    });

    expect(publisher.getSubscriberCount("opened-capsule")).toBe(1);

    response.emit("close");

    expect(publisher.getSubscriberCount("opened-capsule")).toBe(0);
  });

  it("heartbeat를 주기적으로 전송한다", () => {
    const response = new MockSseResponse();

    publisher.subscribe({
      slug: "opened-capsule",
      response: response as never,
      initialMessageCount: 1,
    });

    jest.advanceTimersByTime(25_000);

    expect(response.writes[1]).toBe(": keep-alive\n\n");
  });
});
