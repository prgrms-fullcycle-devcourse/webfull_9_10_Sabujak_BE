const buildFutureExpiresAt = () =>
  new Date(Date.now() + 60 * 60 * 1000).toISOString();

jest.mock("./capsules.service", () => ({
  capsulesService: {
    createSlugReservation: jest.fn(),
    createCapsule: jest.fn(),
    getCapsule: jest.fn(),
    getMessageCount: jest.fn().mockResolvedValue({
      expiresAt: buildFutureExpiresAt(),
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
import {
  CapsuleExpiredException,
  CapsuleNotFoundException,
} from "../../common/exceptions/domain-exception";
import { capsuleMessageCountPublisher } from "./capsule-message-count.publisher";
import { capsulesService } from "./capsules.service";

const mockedCapsulesService = jest.mocked(capsulesService);

describe("GET /capsules/:slug/message-count/stream", () => {
  afterEach(() => {
    capsuleMessageCountPublisher.clear();
    jest.clearAllMocks();
    mockedCapsulesService.getMessageCount.mockResolvedValue({
      expiresAt: buildFutureExpiresAt(),
      messageCount: 7,
    });
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

  it("존재하지 않는 capsule이면 404 JSON 응답을 보낸다", async () => {
    mockedCapsulesService.getMessageCount.mockRejectedValueOnce(
      new CapsuleNotFoundException(),
    );

    const server = await new Promise<ReturnType<typeof app.listen>>(
      (resolve) => {
        const listeningServer = app.listen(0, () => resolve(listeningServer));
      },
    );
    const address = server.address() as AddressInfo;

    try {
      const response = await fetch(
        `http://127.0.0.1:${address.port}/capsules/missing/message-count/stream`,
        {
          headers: {
            Accept: "text/event-stream",
          },
        },
      );

      expect(response.status).toBe(404);
      expect(response.headers.get("content-type")).toContain("application/json");
      await expect(response.json()).resolves.toEqual({
        error: {
          code: "CAPSULE_NOT_FOUND",
          message: "존재하지 않는 캡슐입니다.",
        },
      });
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

  it("만료된 capsule이면 410 JSON 응답을 보낸다", async () => {
    mockedCapsulesService.getMessageCount.mockRejectedValueOnce(
      new CapsuleExpiredException(),
    );

    const server = await new Promise<ReturnType<typeof app.listen>>(
      (resolve) => {
        const listeningServer = app.listen(0, () => resolve(listeningServer));
      },
    );
    const address = server.address() as AddressInfo;

    try {
      const response = await fetch(
        `http://127.0.0.1:${address.port}/capsules/expired/message-count/stream`,
        {
          headers: {
            Accept: "text/event-stream",
          },
        },
      );

      expect(response.status).toBe(410);
      expect(response.headers.get("content-type")).toContain("application/json");
      await expect(response.json()).resolves.toEqual({
        error: {
          code: "CAPSULE_EXPIRED",
          message: "만료된 캡슐입니다.",
        },
      });
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
