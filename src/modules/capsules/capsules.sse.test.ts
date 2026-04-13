jest.mock("./capsules.service", () => ({
  capsulesService: {
    createSlugReservation: jest.fn(),
    createCapsule: jest.fn(),
    getCapsule: jest.fn(),
    getMessageCount: jest.fn(),
    verifyCapsulePassword: jest.fn(),
    updateCapsule: jest.fn(),
    deleteCapsule: jest.fn(),
    createMessage: jest.fn(),
  },
}));

jest.mock("./capsule-message-count.publisher", () => ({
  capsuleMessageCountPublisher: {
    clear: jest.fn(),
    subscribe: jest.fn(),
  },
}));

import { errorHandler } from "../../common/middlewares/error-handler";
import {
  CapsuleExpiredException,
  CapsuleNotFoundException,
} from "../../common/exceptions/domain-exception";
import { capsuleMessageCountPublisher } from "./capsule-message-count.publisher";
import { capsulesService } from "./capsules.service";
import { streamCapsuleMessageCount } from "./capsules.controller";

const mockedCapsulesService = jest.mocked(capsulesService);
const mockedPublisher = jest.mocked(capsuleMessageCountPublisher);

const createMockResponse = () => {
  const response = {
    headersSent: false,
    json: jest.fn(),
    status: jest.fn(),
  };

  response.status.mockReturnValue(response);
  return response;
};

describe("streamCapsuleMessageCount", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("publisher에 slug, response, snapshot getter를 전달한다", async () => {
    const response = { locals: {} } as never;
    mockedCapsulesService.getMessageCount.mockResolvedValue({
      expiresAt: "2026-04-13T12:00:00.000Z",
      messageCount: 7,
    });

    let capturedInput!: Parameters<typeof mockedPublisher.subscribe>[0];
    mockedPublisher.subscribe.mockImplementation(async (input) => {
      capturedInput = input;
      await input.getSnapshot();
      return () => undefined;
    });

    await streamCapsuleMessageCount(
      { params: { slug: "opened-capsule" } } as never,
      response,
    );

    expect(mockedPublisher.subscribe).toHaveBeenCalledTimes(1);
    expect(capturedInput.slug).toBe("opened-capsule");
    expect(capturedInput.response).toBe(response);
    expect(mockedCapsulesService.getMessageCount).toHaveBeenCalledWith({
      slug: "opened-capsule",
    });
  });

  it("존재하지 않는 capsule이면 404 JSON 응답 계약을 유지한다", async () => {
    mockedCapsulesService.getMessageCount.mockRejectedValueOnce(
      new CapsuleNotFoundException(),
    );
    mockedPublisher.subscribe.mockImplementation(async (input) => {
      await input.getSnapshot();
      return () => undefined;
    });

    const request = {
      method: "GET",
      originalUrl: "/capsules/missing/message-count/stream",
      params: { slug: "missing" },
      query: {},
      body: undefined,
    } as never;
    const response = createMockResponse();

    await streamCapsuleMessageCount(request, response as never).catch((error) =>
      errorHandler(error, request, response as never, jest.fn()),
    );

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: "CAPSULE_NOT_FOUND",
        message: "존재하지 않는 캡슐입니다.",
      },
    });
  });

  it("만료된 capsule이면 410 JSON 응답 계약을 유지한다", async () => {
    mockedCapsulesService.getMessageCount.mockRejectedValueOnce(
      new CapsuleExpiredException(),
    );
    mockedPublisher.subscribe.mockImplementation(async (input) => {
      await input.getSnapshot();
      return () => undefined;
    });

    const request = {
      method: "GET",
      originalUrl: "/capsules/expired/message-count/stream",
      params: { slug: "expired" },
      query: {},
      body: undefined,
    } as never;
    const response = createMockResponse();

    await streamCapsuleMessageCount(request, response as never).catch((error) =>
      errorHandler(error, request, response as never, jest.fn()),
    );

    expect(response.status).toHaveBeenCalledWith(410);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: "CAPSULE_EXPIRED",
        message: "만료된 캡슐입니다.",
      },
    });
  });
});
