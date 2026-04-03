jest.mock("./capsules.service", () => ({
  capsulesService: {
    createSlugReservation: jest.fn(),
    createCapsule: jest.fn(),
    getCapsule: jest.fn(),
    getCapsuleStats: jest.fn().mockResolvedValue({
      totalCapsuleCount: 12,
      totalMessageCount: 77,
    }),
    getMessageCount: jest.fn(),
    verifyCapsulePassword: jest.fn(),
    updateCapsule: jest.fn(),
    deleteCapsule: jest.fn(),
    createMessage: jest.fn(),
  },
}));

import { AddressInfo } from "node:net";
import app from "../../app";
import { capsuleStatsPublisher } from "./capsule-stats.publisher";
import { capsulesService } from "./capsules.service";

const mockedCapsulesService = jest.mocked(capsulesService);

describe("GET /capsules/stats/stream", () => {
  afterEach(() => {
    capsuleStatsPublisher.clear();
    jest.clearAllMocks();
    mockedCapsulesService.getCapsuleStats.mockResolvedValue({
      totalCapsuleCount: 12,
      totalMessageCount: 77,
    });
  });

  it("SSE 헤더와 초기 전역 집계 이벤트를 보낸다", async () => {
    const server = await new Promise<ReturnType<typeof app.listen>>(
      (resolve) => {
        const listeningServer = app.listen(0, () => resolve(listeningServer));
      },
    );
    const address = server.address() as AddressInfo;
    const controller = new AbortController();

    try {
      const response = await fetch(
        `http://127.0.0.1:${address.port}/capsules/stats/stream`,
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

      expect(body).toContain("event: capsuleStats");
      expect(body).toContain('"totalCapsuleCount":12');
      expect(body).toContain('"totalMessageCount":77');

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
