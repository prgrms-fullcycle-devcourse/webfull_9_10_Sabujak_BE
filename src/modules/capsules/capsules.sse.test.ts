jest.mock("./capsules.service", () => ({
  capsulesService: {
    createSlugReservation: jest.fn(),
    createCapsule: jest.fn(),
    getCapsule: jest.fn(),
    getMessageCount: jest.fn().mockResolvedValue({
      expiresAt: "2026-03-31T00:00:00.000Z",
      messageCount: 7,
    }),
    verifyCapsulePassword: jest.fn(),
    updateCapsule: jest.fn(),
    deleteCapsule: jest.fn(),
    createMessage: jest.fn(),
  },
}));

import { AddressInfo } from "node:net";
import app from "../../app";
import { capsuleMessageCountPublisher } from "./capsule-message-count.publisher";

describe("GET /capsules/:slug/message-count/stream", () => {
  afterEach(() => {
    capsuleMessageCountPublisher.clear();
  });

  it("SSE 헤더와 초기 이벤트를 보낸다", async () => {
    const server = await new Promise<ReturnType<typeof app.listen>>(
      (resolve) => {
        const listeningServer = app.listen(0, () => resolve(listeningServer));
      },
    );
    const address = server.address() as AddressInfo;
    const controller = new AbortController();

    try {
      const response = await fetch(
        `http://127.0.0.1:${address.port}/capsules/opened-capsule/message-count/stream`,
        {
          signal: controller.signal,
          headers: {
            Accept: "text/event-stream",
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain(
        "text/event-stream",
      );
      expect(response.headers.get("cache-control")).toContain("no-cache");

      const reader = response.body?.getReader();
      const chunk = await reader?.read();
      const body = new TextDecoder().decode(chunk?.value);

      expect(body).toContain("event: messageCount");
      expect(body).toContain('"messageCount":7');

      controller.abort();
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
  });
});
